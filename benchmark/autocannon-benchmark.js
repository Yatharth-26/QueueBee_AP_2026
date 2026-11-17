// Autocannon HTTP Load Testing Script
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee) · Phase 15 Deliverable

process.env.BENCHMARK = 'true';
const autocannon = require('autocannon');
const http = require('http');
const app = require('../src/app');

async function runLoadTests() {
  console.log('🚀 Starting Smart Queue (QueueBee) Autocannon Load Tests...\n');

  // Start internal test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`📡 Temporary load test server running at: ${baseUrl}`);

  try {
    // Benchmark 1: Health Check Endpoint
    console.log('\n--- Test 1: Health Check API Throughput ---');
    const healthResult = await autocannon({
      url: `${baseUrl}/api/health`,
      connections: 20,
      duration: 5,
    });
    console.log(autocannon.printResult(healthResult));

    // Benchmark 2: Public Queue Status & ETA Lookups
    console.log('\n--- Test 2: Public Queues Discovery & Live Status Lookups ---');
    const queuesResult = await autocannon({
      url: `${baseUrl}/api/queues`,
      connections: 20,
      duration: 5,
    });
    console.log(autocannon.printResult(queuesResult));

    console.log('✅ Autocannon load testing completed successfully!');
  } catch (err) {
    console.error('Load testing error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
}

runLoadTests();
