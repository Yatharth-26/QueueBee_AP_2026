// Admin Analytics & Performance Aggregation Service
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const prisma = require('../config/prisma');
const { calculateMedian } = require('../utils/math.util');

/**
 * Returns overall campus queue metrics:
 * - Total students served
 * - Total queue joins
 * - Average waiting time (in minutes)
 * - Median service duration (in seconds & minutes)
 * - No-show count & rate
 * - Active waiting count
 */
const getSystemOverviewStats = async () => {
  // Aggregate entry counts by status
  const countsByStatus = await prisma.queueEntry.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  let totalJoins = 0;
  let totalServed = 0;
  let totalNoShows = 0;
  let totalWaiting = 0;
  let totalCancelled = 0;

  for (const item of countsByStatus) {
    totalJoins += item._count._all;
    if (item.status === 'SERVED') totalServed = item._count._all;
    if (item.status === 'NO_SHOW') totalNoShows = item._count._all;
    if (item.status === 'WAITING' || item.status === 'CALLED') totalWaiting += item._count._all;
    if (item.status === 'CANCELLED') totalCancelled = item._count._all;
  }

  // Calculate Average Waiting Time (joined_at to called_at/served_at) in seconds
  const waitTimeResult = await prisma.$queryRaw`
    SELECT 
      COALESCE(AVG(EXTRACT(EPOCH FROM (called_at - joined_at))), 0) AS "avgWaitSeconds"
    FROM queue_entries
    WHERE status IN ('SERVED', 'CALLED') AND called_at IS NOT NULL
  `;

  const avgWaitSeconds = Math.round(Number(waitTimeResult[0]?.avgWaitSeconds || 0));

  // Calculate Median Service Duration across completed tickets
  const serviceDurations = await prisma.$queryRaw`
    SELECT 
      EXTRACT(EPOCH FROM (served_at - called_at)) AS duration
    FROM queue_entries
    WHERE status = 'SERVED' 
      AND called_at IS NOT NULL 
      AND served_at IS NOT NULL
    ORDER BY served_at DESC
    LIMIT 200
  `;

  const rawDurations = serviceDurations
    .map((r) => Number(r.duration))
    .filter((d) => d >= 10 && d <= 7200);

  const medianServiceSeconds = calculateMedian(rawDurations);

  const totalLocations = await prisma.location.count();
  const totalQueues = await prisma.queue.count();

  return {
    totalJoins,
    totalServed,
    totalNoShows,
    totalWaiting,
    totalCancelled,
    noShowRate: totalServed + totalNoShows > 0
      ? `${((totalNoShows / (totalServed + totalNoShows)) * 100).toFixed(1)}%`
      : '0.0%',
    avgWaitSeconds,
    avgWaitMinutes: (avgWaitSeconds / 60).toFixed(1),
    medianServiceSeconds,
    medianServiceMinutes: (medianServiceSeconds / 60).toFixed(1),
    totalLocations,
    totalQueues,
  };
};

/**
 * Breakdown of analytics by individual queue.
 */
const getQueueAnalytics = async () => {
  const queues = await prisma.queue.findMany({
    include: {
      location: { select: { name: true, building: true } },
    },
  });

  const queueStats = await Promise.all(
    queues.map(async (queue) => {
      const entryStats = await prisma.queueEntry.groupBy({
        by: ['status'],
        where: { queueId: queue.id },
        _count: { _all: true },
      });

      let joins = 0;
      let served = 0;
      let noShows = 0;
      let waiting = 0;

      for (const item of entryStats) {
        joins += item._count._all;
        if (item.status === 'SERVED') served = item._count._all;
        if (item.status === 'NO_SHOW') noShows = item._count._all;
        if (item.status === 'WAITING' || item.status === 'CALLED') waiting += item._count._all;
      }

      return {
        queueId: queue.id,
        name: queue.name,
        locationName: queue.location.name,
        building: queue.location.building,
        status: queue.status,
        maxSize: queue.maxSize,
        joins,
        served,
        noShows,
        waiting,
        medianServiceSeconds: queue.avgServiceSeconds,
        utilizationRate: queue.maxSize > 0 ? `${((waiting / queue.maxSize) * 100).toFixed(0)}%` : '0%',
      };
    })
  );

  return queueStats.sort((a, b) => b.joins - a.joins);
};

/**
 * Hourly Activity and Peak Usage Hours.
 * Groups queue entries by hour of day (0 to 23).
 */
const getHourlyActivity = async () => {
  // Aggregate hourly activity using raw SQL for PostgreSQL date_part
  const hourlyData = await prisma.$queryRaw`
    SELECT 
      EXTRACT(HOUR FROM joined_at) AS hour,
      COUNT(*) AS joins,
      COUNT(CASE WHEN status = 'SERVED' THEN 1 END) AS served,
      COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) AS no_shows
    FROM queue_entries
    GROUP BY hour
    ORDER BY hour ASC
  `;

  return hourlyData.map((row) => ({
    hour: Number(row.hour),
    hourLabel: `${String(row.hour).padStart(2, '0')}:00`,
    joins: Number(row.joins),
    served: Number(row.served),
    noShows: Number(row.no_shows),
  }));
};

/**
 * Computes and syncs hourly stats into `queue_stats_hourly` table.
 */
const syncHourlyStatsTable = async () => {
  const aggregated = await prisma.$executeRaw`
    INSERT INTO queue_stats_hourly (id, queue_id, hour, joins, served, no_shows, avg_wait_seconds)
    SELECT 
      gen_random_uuid() AS id,
      queue_id,
      date_trunc('hour', joined_at) AS hour,
      COUNT(*) AS joins,
      COUNT(CASE WHEN status = 'SERVED' THEN 1 END) AS served,
      COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) AS no_shows,
      COALESCE(AVG(EXTRACT(EPOCH FROM (called_at - joined_at))), 0) AS avg_wait_seconds
    FROM queue_entries
    GROUP BY queue_id, date_trunc('hour', joined_at)
    ON CONFLICT (queue_id, hour) DO UPDATE
    SET 
      joins = EXCLUDED.joins,
      served = EXCLUDED.served,
      no_shows = EXCLUDED.no_shows,
      avg_wait_seconds = EXCLUDED.avg_wait_seconds;
  `;
  return aggregated;
};

module.exports = {
  getSystemOverviewStats,
  getQueueAnalytics,
  getHourlyActivity,
  syncHourlyStatsTable,
};
