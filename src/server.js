// HTTP Server Startup & Graceful Lifecycle Management
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');
const { redis } = require('./config/redis');

const PORT = env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 Smart Queue (QueueBee) Server Started!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`===================================================`);
});

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('HTTP server closed.');

    try {
      await prisma.$disconnect();
      console.log('PostgreSQL (Prisma) disconnected.');

      if (redis) {
        await redis.quit();
        console.log('Redis client disconnected.');
      }
    } catch (err) {
      console.error('Error during database teardown:', err);
    }

    process.exit(0);
  });

  // Force exit after 10 seconds if hanging
  setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
