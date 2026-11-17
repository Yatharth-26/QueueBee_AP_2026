// Staff Counter Management Service
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const prisma = require('../config/prisma');
const redisQueue = require('./redis-queue.service');
const etaService = require('./eta.service');

/**
 * Returns all queues assigned to this staff member.
 */
const getAssignedQueues = async (staffUserId) => {
  const assignments = await prisma.staffAssignment.findMany({
    where: { userId: staffUserId },
    include: {
      queue: {
        include: {
          location: { select: { id: true, name: true, building: true } },
          _count: {
            select: {
              entries: { where: { status: 'WAITING' } },
            },
          },
        },
      },
    },
  });

  return assignments.map((a) => ({
    ...a.queue,
    waitingCount: a.queue._count.entries,
  }));
};

/**
 * Returns detailed queue entries for staff counter view:
 * 1. Currently serving (CALLED)
 * 2. Waiting students (WAITING, ordered by ticketNo ASC)
 */
const getQueueEntriesForStaff = async (queueId) => {
  const queue = await prisma.queue.findUnique({
    where: { id: queueId },
    include: {
      location: true,
    },
  });

  if (!queue) {
    const error = new Error('Queue not found');
    error.statusCode = 404;
    throw error;
  }

  // Active called student
  const currentlyServing = await prisma.queueEntry.findFirst({
    where: {
      queueId,
      status: 'CALLED',
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      staff: { select: { id: true, name: true } },
    },
    orderBy: { calledAt: 'desc' },
  });

  // Waiting students in strict FIFO order
  const waitingEntries = await prisma.queueEntry.findMany({
    where: {
      queueId,
      status: 'WAITING',
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { ticketNo: 'asc' },
  });

  return {
    queue,
    currentlyServing,
    waitingEntries,
    totalWaiting: waitingEntries.length,
  };
};

/**
 * Concurrency-Safe "Call Next Student".
 *
 * Employs PostgreSQL row-level locking: `FOR UPDATE SKIP LOCKED`.
 * If multiple staff members call the next student simultaneously:
 * - Worker A locks the first waiting row.
 * - Worker B automatically skips the locked row and locks the second waiting row.
 * Eliminates race conditions and prevents multiple staff members from calling the same student!
 *
 * @param {string} queueId
 * @param {string} staffUserId
 */
const callNextStudent = async (queueId, staffUserId) => {
  const result = await prisma.$transaction(async (tx) => {
    // Check if staff member already has a currently CALLED student at their counter
    const activeCalledByStaff = await tx.queueEntry.findFirst({
      where: {
        queueId,
        servedBy: staffUserId,
        status: 'CALLED',
      },
    });

    if (activeCalledByStaff) {
      const error = new Error(
        `Ticket #${activeCalledByStaff.ticketNo} is currently called at your counter. Please complete service or mark no-show before calling the next student.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Select the next eligible waiting ticket using FOR UPDATE SKIP LOCKED
    const nextCandidates = await tx.$queryRaw`
      SELECT 
        id, 
        ticket_no AS "ticketNo", 
        user_id AS "userId", 
        joined_at AS "joinedAt"
      FROM queue_entries
      WHERE queue_id = ${queueId}::uuid AND status = 'WAITING'::entry_status_enum
      ORDER BY ticket_no ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (!nextCandidates || nextCandidates.length === 0) {
      const error = new Error('No waiting students in the queue');
      error.statusCode = 404;
      throw error;
    }

    const nextEntry = nextCandidates[0];

    // Transition status to CALLED and assign counter staff
    const updatedEntry = await tx.queueEntry.update({
      where: { id: nextEntry.id },
      data: {
        status: 'CALLED',
        calledAt: new Date(),
        servedBy: staffUserId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        queue: { select: { id: true, name: true } },
      },
    });

    return updatedEntry;
  });

  // Post-transaction Redis updates
  await redisQueue.removeWaitingEntry(queueId, result.id);
  await redisQueue.setCurrentServing(queueId, {
    id: result.id,
    ticketNo: result.ticketNo,
    studentName: result.user.name,
    calledAt: result.calledAt,
  });

  return result;
};

/**
 * Completes service for a called student ticket.
 * Records service completion time, recalculates median service duration,
 * and updates hourly analytics.
 */
const completeService = async (entryId, staffUserId) => {
  const entry = await prisma.queueEntry.findUnique({
    where: { id: entryId },
    include: { queue: true },
  });

  if (!entry) {
    const error = new Error('Queue entry not found');
    error.statusCode = 404;
    throw error;
  }

  if (entry.status !== 'CALLED') {
    const error = new Error(`Cannot complete service: ticket status is '${entry.status}' (must be 'CALLED')`);
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();

  // Update in PostgreSQL
  const updatedEntry = await prisma.queueEntry.update({
    where: { id: entryId },
    data: {
      status: 'SERVED',
      servedAt: now,
      servedBy: staffUserId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Calculate actual service duration
  const serviceDurationSeconds = entry.calledAt
    ? Math.round((now.getTime() - new Date(entry.calledAt).getTime()) / 1000)
    : 0;

  // Recalculate median service duration based on historical records
  const newMedian = await etaService.updateAndGetMedianServiceDuration(entry.queueId);

  // Clear Redis currently serving if this entry was current
  const currentServingInRedis = await redisQueue.getCurrentServing(entry.queueId);
  if (currentServingInRedis?.id === entryId) {
    await redisQueue.setCurrentServing(entry.queueId, null);
  }

  return {
    entry: updatedEntry,
    serviceDurationSeconds,
    newMedianServiceSeconds: newMedian,
    message: `Ticket #${entry.ticketNo} served successfully (${serviceDurationSeconds}s)`,
  };
};

/**
 * Marks a called student as NO_SHOW if they fail to arrive at the counter.
 */
const markNoShow = async (entryId, staffUserId) => {
  const entry = await prisma.queueEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry) {
    const error = new Error('Queue entry not found');
    error.statusCode = 404;
    throw error;
  }

  if (entry.status !== 'CALLED') {
    const error = new Error(`Cannot mark no-show: ticket status is '${entry.status}' (must be 'CALLED')`);
    error.statusCode = 400;
    throw error;
  }

  const updatedEntry = await prisma.queueEntry.update({
    where: { id: entryId },
    data: {
      status: 'NO_SHOW',
      servedAt: new Date(),
      servedBy: staffUserId,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  // Clear Redis currently serving if this was the active entry
  const currentServingInRedis = await redisQueue.getCurrentServing(entry.queueId);
  if (currentServingInRedis?.id === entryId) {
    await redisQueue.setCurrentServing(entry.queueId, null);
  }

  return {
    entry: updatedEntry,
    message: `Ticket #${entry.ticketNo} marked as NO-SHOW`,
  };
};

/**
 * Modifies operational status of a queue: OPEN, PAUSED, CLOSED.
 */
const updateQueueStatus = async (queueId, newStatus) => {
  const allowed = ['OPEN', 'PAUSED', 'CLOSED'];
  if (!allowed.includes(newStatus)) {
    const error = new Error(`Invalid queue status. Must be one of: ${allowed.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const updatedQueue = await prisma.queue.update({
    where: { id: queueId },
    data: { status: newStatus },
    include: {
      location: true,
    },
  });

  return updatedQueue;
};

module.exports = {
  getAssignedQueues,
  getQueueEntriesForStaff,
  callNextStudent,
  completeService,
  markNoShow,
  updateQueueStatus,
};
