// Redis Sorted Set Queue Service
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const { redis, isRedisReady } = require('../config/redis');
const prisma = require('../config/prisma');

/**
 * Key Patterns:
 * - `queue:{queueId}`: Sorted Set holding WAITING students. Score = ticketNo. Member = entryId
 * - `queue:{queueId}:current`: String/JSON storing current CALLED student ticket info
 */
const getQueueKey = (queueId) => `queue:${queueId}`;
const getCurrentKey = (queueId) => `queue:${queueId}:current`;

/**
 * Adds an active queue entry to Redis Sorted Set.
 * Preserves strict FIFO order using ticketNo as score.
 */
const addWaitingEntry = async (queueId, entryId, ticketNo) => {
  if (!isRedisReady()) return false;
  try {
    await redis.zadd(getQueueKey(queueId), ticketNo, entryId);
    return true;
  } catch (error) {
    console.warn(`Redis addWaitingEntry failed: ${error.message}`);
    return false;
  }
};

/**
 * Retrieves the 0-indexed position (people ahead) of an entry in the waiting queue.
 * O(log N) complexity compared to relational database COUNT queries.
 */
const getWaitingPosition = async (queueId, entryId) => {
  if (!isRedisReady()) return null;
  try {
    const rank = await redis.zrank(getQueueKey(queueId), entryId);
    return rank !== null ? parseInt(rank, 10) : null;
  } catch (error) {
    console.warn(`Redis getWaitingPosition failed: ${error.message}`);
    return null;
  }
};

/**
 * Removes an entry from the waiting Sorted Set.
 * Invoked on status transitions: CALLED, SERVED, CANCELLED, NO_SHOW.
 */
const removeWaitingEntry = async (queueId, entryId) => {
  if (!isRedisReady()) return false;
  try {
    await redis.zrem(getQueueKey(queueId), entryId);
    return true;
  } catch (error) {
    console.warn(`Redis removeWaitingEntry failed: ${error.message}`);
    return false;
  }
};

/**
 * Gets total count of waiting students in the queue.
 */
const getWaitingCount = async (queueId) => {
  if (!isRedisReady()) return null;
  try {
    const count = await redis.zcard(getQueueKey(queueId));
    return count;
  } catch (error) {
    console.warn(`Redis getWaitingCount failed: ${error.message}`);
    return null;
  }
};

/**
 * Sets currently called student in Redis.
 */
const setCurrentServing = async (queueId, entryData) => {
  if (!isRedisReady()) return false;
  try {
    if (entryData) {
      await redis.set(getCurrentKey(queueId), JSON.stringify(entryData), 'EX', 7200); // 2 hours TTL
    } else {
      await redis.del(getCurrentKey(queueId));
    }
    return true;
  } catch (error) {
    console.warn(`Redis setCurrentServing failed: ${error.message}`);
    return false;
  }
};

/**
 * Gets currently called student from Redis.
 */
const getCurrentServing = async (queueId) => {
  if (!isRedisReady()) return null;
  try {
    const data = await redis.get(getCurrentKey(queueId));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn(`Redis getCurrentServing failed: ${error.message}`);
    return null;
  }
};

/**
 * Rebuilds the Redis Sorted Set from PostgreSQL authoritative data.
 * Crucial for disaster recovery, server restarts, or Redis flush.
 */
const rebuildQueueFromDB = async (queueId) => {
  if (!isRedisReady()) return false;
  try {
    const queueKey = getQueueKey(queueId);

    // Fetch all active WAITING entries in FIFO order from PostgreSQL
    const waitingEntries = await prisma.queueEntry.findMany({
      where: {
        queueId,
        status: 'WAITING',
      },
      orderBy: { ticketNo: 'asc' },
      select: {
        id: true,
        ticketNo: true,
      },
    });

    const pipeline = redis.pipeline();
    pipeline.del(queueKey);

    for (const entry of waitingEntries) {
      pipeline.zadd(queueKey, entry.ticketNo, entry.id);
    }

    // Also sync currently CALLED student
    const calledEntry = await prisma.queueEntry.findFirst({
      where: {
        queueId,
        status: 'CALLED',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { calledAt: 'desc' },
    });

    if (calledEntry) {
      pipeline.set(
        getCurrentKey(queueId),
        JSON.stringify({
          id: calledEntry.id,
          ticketNo: calledEntry.ticketNo,
          studentName: calledEntry.user.name,
          calledAt: calledEntry.calledAt,
        }),
        'EX',
        7200
      );
    } else {
      pipeline.del(getCurrentKey(queueId));
    }

    await pipeline.exec();
    console.log(`Synced Redis Sorted Set for queue ${queueId} (${waitingEntries.length} entries)`);
    return true;
  } catch (error) {
    console.error(`Failed to rebuild Redis queue: ${error.message}`);
    return false;
  }
};

module.exports = {
  addWaitingEntry,
  getWaitingPosition,
  removeWaitingEntry,
  getWaitingCount,
  setCurrentServing,
  getCurrentServing,
  rebuildQueueFromDB,
  isRedisReady,
};
