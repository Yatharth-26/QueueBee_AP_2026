// Redis Client Configuration
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const Redis = require('ioredis');
const env = require('./env');

let redisClient;
let isRedisAvailable = false;

try {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy(times) {
      if (times > 5) {
        console.warn('⚠️ Redis reconnection attempts exceeded limit. Operating in DB-fallback mode.');
        return null; // Stop reconnecting after 5 attempts
      }
      return Math.min(times * 100, 2000);
    },
  });

  redisClient.on('connect', () => {
    isRedisAvailable = true;
    console.log('✅ Connected to Redis successfully');
  });

  redisClient.on('ready', () => {
    isRedisAvailable = true;
  });

  redisClient.on('error', (err) => {
    isRedisAvailable = false;
    console.warn(`⚠️ Redis error: ${err.message}. System will safely fallback to PostgreSQL.`);
  });

  redisClient.on('close', () => {
    isRedisAvailable = false;
  });
} catch (error) {
  console.error('Failed to initialize Redis client:', error.message);
  isRedisAvailable = false;
}

const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
  }
};

module.exports = {
  redis: redisClient,
  isRedisReady: () => isRedisAvailable,
  closeRedis,
};
