const redis = require('redis');
require('dotenv').config();

class RedisCache {
  constructor() {
    this.client = null;
  }

  async connect() {
    if (this.client) return;
    
    // Skip Redis if no URL configured
    if (!process.env.REDIS_URL) {
      console.log('⚠️ Redis disabled (no REDIS_URL configured)');
      return;
    }

    this.client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await this.client.connect();
    console.log('✅ Redis connected');
  }

  async get(key) {
    if (!this.client) await this.connect();
    if (!this.client) return null; // Redis disabled
    return await this.client.get(key);
  }

  async set(key, value, ttl = 3600) {
    if (!this.client) await this.connect();
    if (!this.client) return null; // Redis disabled
    return await this.client.setEx(key, ttl, value);
  }

  async setex(key, ttl, value) {
    return await this.set(key, value, ttl);
  }

  async del(key) {
    if (!this.client) await this.connect();
    if (!this.client) return null; // Redis disabled
    return await this.client.del(key);
  }

  async flush() {
    if (!this.client) await this.connect();
    if (!this.client) return null; // Redis disabled
    return await this.client.flushAll();
  }
}

module.exports = new RedisCache();