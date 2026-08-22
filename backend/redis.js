require('dotenv').config();
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  }
});

redis.on('error', (err) => {
  console.error('Redis connection error (non-fatal):', err.message);
});

module.exports = redis;