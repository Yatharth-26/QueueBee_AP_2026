// Performance Benchmark: PostgreSQL vs Redis Sorted Sets
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee) · Core Technical Differentiator 3

const prisma = require('../src/config/prisma');
const redisQueue = require('../src/services/redis-queue.service');

describe('Performance Comparison: PostgreSQL vs Redis Sorted Sets', () => {
  let testQueue;
  let testEntries = [];
  const BENCHMARK_ITERATIONS = 50;

  beforeAll(async () => {
    // Pick an existing seeded queue with waiting entries
    testQueue = await prisma.queue.findFirst({
      where: {
        entries: { some: { status: 'WAITING' } },
      },
      include: {
        entries: { where: { status: 'WAITING' } },
      },
    });

    if (!testQueue || testQueue.entries.length === 0) {
      // Create a dummy queue and entries if needed
      const loc = await prisma.location.create({
        data: { name: 'Bench Location', building: 'Lab' },
      });
      testQueue = await prisma.queue.create({
        data: { locationId: loc.id, name: 'Bench Queue', status: 'OPEN' },
      });
      const dummyUser = await prisma.user.findFirst();
      for (let i = 1; i <= 5; i++) {
        const e = await prisma.queueEntry.create({
          data: {
            queueId: testQueue.id,
            userId: dummyUser.id,
            ticketNo: i,
            status: 'WAITING',
          },
        });
        testEntries.push(e);
      }
    } else {
      testEntries = testQueue.entries;
    }

    // Ensure Redis has the queue synchronized
    await redisQueue.rebuildQueueFromDB(testQueue.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function computeStats(latenciesMs) {
    const sorted = [...latenciesMs].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const avg = sum / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    return { avg, median, p95, p99 };
  }

  test('Benchmark: Position Lookup Latency (PostgreSQL vs Redis)', async () => {
    const targetEntry = testEntries[Math.min(testEntries.length - 1, 2)];

    // 1. Measure PostgreSQL Count Queries
    const pgLatencies = [];
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      const start = process.hrtime.bigint();
      await prisma.queueEntry.count({
        where: {
          queueId: testQueue.id,
          status: 'WAITING',
          ticketNo: { lt: targetEntry.ticketNo },
        },
      });
      const end = process.hrtime.bigint();
      pgLatencies.push(Number(end - start) / 1e6); // convert nanoseconds to milliseconds
    }

    // 2. Measure Redis Sorted Set ZRANK Lookups
    const redisLatencies = [];
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      const start = process.hrtime.bigint();
      await redisQueue.getWaitingPosition(testQueue.id, targetEntry.id);
      const end = process.hrtime.bigint();
      redisLatencies.push(Number(end - start) / 1e6);
    }

    const pgStats = computeStats(pgLatencies);
    const redisStats = computeStats(redisLatencies);

    console.log('\n======================================================');
    console.log('📊 BENCHMARK RESULTS: PostgreSQL vs Redis Sorted Sets');
    console.log(`   (Iterations: ${BENCHMARK_ITERATIONS} lookups per engine)`);
    console.log('------------------------------------------------------');
    console.log(`PostgreSQL Relational COUNT Query:`);
    console.log(`   Avg Latency:    ${pgStats.avg.toFixed(3)} ms`);
    console.log(`   Median Latency: ${pgStats.median.toFixed(3)} ms`);
    console.log(`   P95 Latency:    ${pgStats.p95.toFixed(3)} ms`);
    console.log(`   P99 Latency:    ${pgStats.p99.toFixed(3)} ms`);
    console.log('------------------------------------------------------');
    console.log(`Redis In-Memory Sorted Set (ZRANK O(log N)):`);
    console.log(`   Avg Latency:    ${redisStats.avg.toFixed(3)} ms`);
    console.log(`   Median Latency: ${redisStats.median.toFixed(3)} ms`);
    console.log(`   P95 Latency:    ${redisStats.p95.toFixed(3)} ms`);
    console.log(`   P99 Latency:    ${redisStats.p99.toFixed(3)} ms`);
    console.log('======================================================\n');

    expect(pgLatencies.length).toBe(BENCHMARK_ITERATIONS);
    expect(redisLatencies.length).toBe(BENCHMARK_ITERATIONS);
  });
});
