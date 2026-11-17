// Intelligent Median-Based Waiting-Time Estimation (ETA) Service
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const prisma = require('../config/prisma');
const { calculateMedian, calculateETA } = require('../utils/math.util');

/**
 * Retrieves the recent completed service durations for a specific queue
 * and computes the statistical median.
 *
 * Durations are calculated as: EXTRACT(EPOCH FROM (served_at - called_at))
 * Outliers (e.g. system left open overnight or counter issues) do not skew the median.
 *
 * @param {string} queueId
 * @param {number} sampleSize - Default last 10 completed tickets
 * @returns {Promise<number>} Median service duration in seconds
 */
const updateAndGetMedianServiceDuration = async (queueId, sampleSize = 10) => {
  try {
    // Fetch recent served entries with both called_at and served_at timestamps
    const recentServed = await prisma.queueEntry.findMany({
      where: {
        queueId,
        status: 'SERVED',
        calledAt: { not: null },
        servedAt: { not: null },
      },
      orderBy: { servedAt: 'desc' },
      take: sampleSize,
      select: {
        calledAt: true,
        servedAt: true,
      },
    });

    if (recentServed.length === 0) {
      // If no historical services yet, fallback to default configured in queue
      const queue = await prisma.queue.findUnique({
        where: { id: queueId },
        select: { avgServiceSeconds: true },
      });
      return queue?.avgServiceSeconds || 300; // default 5 mins
    }

    // Compute durations in seconds, discarding anomalies (< 10 seconds or > 2 hours)
    const durations = recentServed
      .map((entry) => {
        const diffMs = new Date(entry.servedAt).getTime() - new Date(entry.calledAt).getTime();
        return Math.floor(diffMs / 1000);
      })
      .filter((seconds) => seconds >= 10 && seconds <= 7200);

    if (durations.length === 0) {
      return 300;
    }

    const calculatedMedian = calculateMedian(durations);

    // Update the queue record with this fresh median service duration
    await prisma.queue.update({
      where: { id: queueId },
      data: { avgServiceSeconds: calculatedMedian },
    });

    return calculatedMedian;
  } catch (error) {
    console.warn(`ETA calculation fallback for queue ${queueId}: ${error.message}`);
    return 300;
  }
};

/**
 * Computes estimated wait time for a student at a given position.
 *
 * Assumptions:
 * 1. Each person ahead will take approximately the median service duration.
 * 2. If a student is currently called and being served, we assume ~50% of their service time remains.
 *
 * @param {number} peopleAhead
 * @param {number} medianServiceSeconds
 * @param {boolean} isServingStudent
 */
const getEstimatedWaitTime = (peopleAhead, medianServiceSeconds, isServingStudent = false) => {
  return calculateETA(peopleAhead, medianServiceSeconds, isServingStudent);
};

module.exports = {
  updateAndGetMedianServiceDuration,
  getEstimatedWaitTime,
};
