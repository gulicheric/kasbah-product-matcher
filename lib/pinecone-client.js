const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

class PineconeClient {
  constructor() {
    this.client = null;
    this.index = null;
  }

  async initialize() {
    if (this.index) return this.index;

    this.client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });

    this.index = this.client.index(process.env.PINECONE_INDEX_NAME);
    
    console.log('✅ Pinecone client initialized');
    return this.index;
  }

  async createIndex() {
    try {
      if (!this.client) {
        this.client = new Pinecone({
          apiKey: process.env.PINECONE_API_KEY
        });
      }
      
      await this.client.createIndex({
        name: process.env.PINECONE_INDEX_NAME,
        dimension: parseInt(process.env.EMBEDDING_DIMENSION) || 1536,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      console.log('✅ Pinecone index created successfully');
    } catch (error) {
      if (error.message?.includes('already exists')) {
        console.log('ℹ️ Index already exists');
      } else {
        throw error;
      }
    }
  }

  async upsertBatch(vectors) {
    if (!this.index) await this.initialize();
    
    try {
      const response = await this.index.upsert(vectors);
      return response;
    } catch (error) {
      console.error('Error upserting vectors:', error);
      throw error;
    }
  }

  async query(embedding, topK = 20, filter = {}) {
    if (!this.index) await this.initialize();
    
    try {
      const queryOptions = {
        vector: embedding,
        topK,
        includeValues: false,
        includeMetadata: true
      };
      
      // Only add filter if it has properties (Pinecone v6+ requirement)
      if (filter && Object.keys(filter).length > 0) {
        queryOptions.filter = filter;
      }
      
      const queryResponse = await this.index.query(queryOptions);
      
      return queryResponse.matches || [];
    } catch (error) {
      console.error('Error querying Pinecone:', error);
      throw error;
    }
  }

  async getStats() {
    if (!this.index) await this.initialize();
    
    const stats = await this.index.describeIndexStats();
    return stats;
  }
}

module.exports = new PineconeClient();