const OpenAI = require('openai');
const crypto = require('crypto');
const redis = require('./redis-cache');

class EmbeddingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.localCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      generated: 0
    };
  }

  async getEmbedding(text) {
    // Generate cache key
    const cacheKey = `emb:${crypto.createHash('md5').update(text).digest('hex')}`;
    
    // Check local memory cache first (L1)
    if (this.localCache.has(cacheKey)) {
      this.cacheStats.hits++;
      return this.localCache.get(cacheKey);
    }

    // Check Redis cache (L2) - Skip if Redis unavailable
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const embedding = JSON.parse(cached);
        this.localCache.set(cacheKey, embedding);
        
        // Keep local cache size manageable
        if (this.localCache.size > 1000) {
          const firstKey = this.localCache.keys().next().value;
          this.localCache.delete(firstKey);
        }
        
        this.cacheStats.hits++;
        return embedding;
      }
    } catch (error) {
      // Silently skip Redis if unavailable
      if (!error.message.includes('ECONNREFUSED')) {
        console.warn('Redis cache error:', error.message);
      }
    }

    // Generate new embedding
    this.cacheStats.misses++;
    this.cacheStats.generated++;
    
    const response = await this.openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text,
      dimensions: parseInt(process.env.EMBEDDING_DIMENSION) || 512
    });

    const embedding = response.data[0].embedding;

    // Cache in both layers
    this.localCache.set(cacheKey, embedding);
    
    try {
      await redis.setex(cacheKey, 2592000, JSON.stringify(embedding)); // 30 days
    } catch (error) {
      // Silently skip Redis if unavailable
      if (!error.message.includes('ECONNREFUSED')) {
        console.warn('Failed to cache in Redis:', error.message);
      }
    }

    return embedding;
  }

  async getBatchEmbeddings(texts) {
    return Promise.all(texts.map(text => this.getEmbedding(text)));
  }

  getStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      localCacheSize: this.localCache.size
    };
  }
}

module.exports = new EmbeddingService();