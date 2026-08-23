require('dotenv').config();
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
  family: 4,
  tls: {
    rejectUnauthorized: false
  }
});
redis.on('error', (err) => {
  console.error('Redis connection error (non-fatal):', err.message);
});
redis.on('connect', () => {
  console.log('Redis connected successfully');
});
module.exports = redis;
