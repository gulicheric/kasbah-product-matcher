const pinecone = require('../lib/pinecone-client');
const embeddings = require('../lib/embedding-service');
require('dotenv').config();

async function monitorSystem() {
  console.log('📊 System Monitoring Dashboard\n');
  
  try {
    // Pinecone stats
    await pinecone.initialize();
    const pineconeStats = await pinecone.getStats();
    
    console.log('🌲 Pinecone Status:');
    console.log(`  - Index: ${process.env.PINECONE_INDEX_NAME}`);
    console.log(`  - Total Vectors: ${pineconeStats.totalVectorCount?.toLocaleString() || 0}`);
    console.log(`  - Dimensions: ${pineconeStats.dimension || 512}`);
    
    // Embedding service stats
    const embeddingStats = embeddings.getStats();
    console.log('\n🧠 Embedding Cache:');
    console.log(`  - Cache Hit Rate: ${embeddingStats.hitRate}`);
    console.log(`  - Total Hits: ${embeddingStats.hits}`);
    console.log(`  - Total Misses: ${embeddingStats.misses}`);
    console.log(`  - Generated: ${embeddingStats.generated}`);
    console.log(`  - Local Cache Size: ${embeddingStats.localCacheSize}`);
    
    // System health
    console.log('\n💚 System Health:');
    console.log(`  - Node Version: ${process.version}`);
    console.log(`  - Memory Usage: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Uptime: ${(process.uptime() / 60).toFixed(2)} minutes`);
    
  } catch (error) {
    console.error('❌ Monitoring failed:', error.message);
  }
}

// Run once if called directly
if (require.main === module) {
  monitorSystem()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
} else {
  // Export for use in other scripts
  module.exports = { monitorSystem };
}