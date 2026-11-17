// Concurrency-Safe Student Queue Service
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const prisma = require('../config/prisma');
const redisQueue = require('./redis-queue.service');
const etaService = require('./eta.service');

/**
 * Concurrency-Safe Digital Queue Joining.
 *
 * Implements strict atomic ticket allocation using PostgreSQL row locking (`FOR UPDATE`).
 * Prevents race conditions, duplicate ticket numbers, capacity overflow,
 * and duplicate student entries under heavy concurrent requests.
 *
 * @param {string} queueId
 * @param {string} userId
 */
const joinQueue = async (queueId, userId) => {
  // Execute within an interactive ACID transaction
  const result = await prisma.$transaction(async (tx) => {
    // Step 1: Explicitly lock the target queue row using raw SQL FOR UPDATE
    const lockedQueues = await tx.$queryRaw`
      SELECT 
        id, 
        name, 
        status, 
        max_size AS "maxSize", 
        next_ticket_no AS "nextTicketNo", 
        avg_service_seconds AS "avgServiceSeconds"
      FROM queues 
      WHERE id = ${queueId}::uuid 
      FOR UPDATE
    `;

    if (!lockedQueues || lockedQueues.length === 0) {
      const error = new Error('Queue not found');
      error.statusCode = 404;
      throw error;
    }

    const queue = lockedQueues[0];

    // Step 2: Validate queue operational status
    if (queue.status !== 'OPEN') {
      const error = new Error(`Cannot join queue. Queue is currently ${queue.status}.`);
      error.statusCode = 400;
      throw error;
    }

    // Step 3: Verify student does not already have an active ticket
    const existingActive = await tx.queueEntry.findFirst({
      where: {
        queueId,
        userId,
        status: { in: ['WAITING', 'CALLED'] },
      },
    });

    if (existingActive) {
      const error = new Error('You already have an active ticket in this queue');
      error.statusCode = 400;
      error.existingTicket = existingActive.ticketNo;
      throw error;
    }

    // Step 4: Verify queue capacity
    const waitingCount = await tx.queueEntry.count({
      where: {
        queueId,
        status: 'WAITING',
      },
    });

    if (waitingCount >= queue.maxSize) {
      const error = new Error(`Queue is at maximum capacity (${queue.maxSize} students). Please wait for counter progress.`);
      error.statusCode = 400;
      throw error;
    }

    // Step 5: Allocate ticket number monotonically and atomically inside the lock
    const allocatedTicketNo = queue.nextTicketNo;

    await tx.$executeRaw`
      UPDATE queues 
      SET next_ticket_no = next_ticket_no + 1 
      WHERE id = ${queueId}::uuid
    `;

    // Step 6: Create the queue entry record
    const entry = await tx.queueEntry.create({
      data: {
        queueId,
        userId,
        ticketNo: allocatedTicketNo,
        status: 'WAITING',
      },
      include: {
        queue: {
          select: {
            id: true,
            name: true,
            avgServiceSeconds: true,
            location: { select: { id: true, name: true, building: true } },
          },
        },
      },
    });

    return {
      entry,
      peopleAhead: waitingCount,
      medianServiceSeconds: queue.avgServiceSeconds,
    };
  });

  // Step 7: Post-commit Redis synchronization (Redis failure does not abort PostgreSQL transaction)
  await redisQueue.addWaitingEntry(queueId, result.entry.id, result.entry.ticketNo);

  // Step 8: Calculate Initial ETA
  const eta = etaService.getEstimatedWaitTime(
    result.peopleAhead,
    result.medianServiceSeconds,
    false
  );

  return {
    entryId: result.entry.id,
    queueId: result.entry.queueId,
    queueName: result.entry.queue.name,
    location: result.entry.queue.location,
    ticketNo: result.entry.ticketNo,
    status: result.entry.status,
    joinedAt: result.entry.joinedAt,
    peopleAhead: result.peopleAhead,
    estimatedWait: eta,
  };
};

/**
 * Leaves a queue before being served.
 * Transitions ticket status to CANCELLED and removes entry from Redis.
 */
const leaveQueue = async (queueId, userId) => {
  const activeEntry = await prisma.queueEntry.findFirst({
    where: {
      queueId,
      userId,
      status: { in: ['WAITING', 'CALLED'] },
    },
  });

  if (!activeEntry) {
    const error = new Error('No active ticket found for this queue');
    error.statusCode = 404;
    throw error;
  }

  // Update in PostgreSQL
  const updatedEntry = await prisma.queueEntry.update({
    where: { id: activeEntry.id },
    data: { status: 'CANCELLED' },
  });

  // Remove from Redis Sorted Set
  await redisQueue.removeWaitingEntry(queueId, activeEntry.id);

  return {
    entryId: updatedEntry.id,
    ticketNo: updatedEntry.ticketNo,
    status: 'CANCELLED',
    message: 'You have left the queue successfully',
  };
};

/**
 * Retrieves the student's live queue position, status, and median-based ETA.
 * Optimized with Redis Sorted Sets; falls back automatically to PostgreSQL.
 */
const getMyPosition = async (queueId, userId) => {
  // Find student's active entry
  const entry = await prisma.queueEntry.findFirst({
    where: {
      queueId,
      userId,
      status: { in: ['WAITING', 'CALLED'] },
    },
    include: {
      queue: {
        select: {
          id: true,
          name: true,
          status: true,
          avgServiceSeconds: true,
          location: { select: { id: true, name: true, building: true } },
        },
      },
    },
  });

  if (!entry) {
    return null;
  }

  // Check if someone is currently called and being served
  const currentServing = await prisma.queueEntry.findFirst({
    where: {
      queueId,
      status: 'CALLED',
    },
    select: {
      id: true,
      ticketNo: true,
      calledAt: true,
    },
    orderBy: { calledAt: 'desc' },
  });

  // Case 1: Student is currently CALLED!
  if (entry.status === 'CALLED') {
    return {
      entryId: entry.id,
      queueId: entry.queueId,
      queueName: entry.queue.name,
      queueStatus: entry.queue.status,
      location: entry.queue.location,
      ticketNo: entry.ticketNo,
      status: 'CALLED',
      peopleAhead: 0,
      isCalled: true,
      isServed: false,
      estimatedWait: {
        etaSeconds: 0,
        etaMinutes: 0,
        formattedETA: 'Your ticket is CALLED! Please proceed to the service counter immediately.',
      },
      currentServingTicket: entry.ticketNo,
      source: 'PostgreSQL',
    };
  }

  // Case 2: Student is WAITING
  let peopleAhead = null;
  let source = 'PostgreSQL';

  // Attempt fast Redis lookup (ZRANK)
  if (redisQueue.isRedisReady()) {
    const redisRank = await redisQueue.getWaitingPosition(queueId, entry.id);
    if (redisRank !== null) {
      peopleAhead = redisRank;
      source = 'Redis (Sorted Set O(log N))';
    }
  }

  // Fallback to PostgreSQL if Redis is disabled or missing the key
  if (peopleAhead === null) {
    peopleAhead = await prisma.queueEntry.count({
      where: {
        queueId,
        status: 'WAITING',
        ticketNo: { lt: entry.ticketNo },
      },
    });
    source = 'PostgreSQL Fallback';
  }

  // Compute median-based ETA
  const isSomeoneServing = Boolean(currentServing);
  const eta = etaService.getEstimatedWaitTime(
    peopleAhead,
    entry.queue.avgServiceSeconds,
    isSomeoneServing
  );

  return {
    entryId: entry.id,
    queueId: entry.queueId,
    queueName: entry.queue.name,
    queueStatus: entry.queue.status,
    location: entry.queue.location,
    ticketNo: entry.ticketNo,
    status: 'WAITING',
    peopleAhead,
    isCalled: false,
    isServed: false,
    estimatedWait: eta,
    currentServingTicket: currentServing ? currentServing.ticketNo : null,
    source,
  };
};

/**
 * Returns public queue status for students browsing available counters.
 */
const getQueuePublicStatus = async (queueId) => {
  const queue = await prisma.queue.findUnique({
    where: { id: queueId },
    include: {
      location: { select: { id: true, name: true, building: true } },
    },
  });

  if (!queue) {
    const error = new Error('Queue not found');
    error.statusCode = 404;
    throw error;
  }

  // Waiting count
  let waitingCount = await redisQueue.getWaitingCount(queueId);
  if (waitingCount === null) {
    waitingCount = await prisma.queueEntry.count({
      where: { queueId, status: 'WAITING' },
    });
  }

  // Currently serving
  const currentServing = await prisma.queueEntry.findFirst({
    where: { queueId, status: 'CALLED' },
    select: { ticketNo: true, calledAt: true },
    orderBy: { calledAt: 'desc' },
  });

  return {
    id: queue.id,
    name: queue.name,
    status: queue.status,
    maxSize: queue.maxSize,
    waitingCount,
    currentServingTicket: currentServing ? currentServing.ticketNo : null,
    medianServiceSeconds: queue.avgServiceSeconds,
    location: queue.location,
  };
};

module.exports = {
  joinQueue,
  leaveQueue,
  getMyPosition,
  getQueuePublicStatus,
};
