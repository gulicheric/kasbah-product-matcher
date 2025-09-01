const pinecone = require('../lib/pinecone-client');
require('dotenv').config();

async function setupPinecone() {
  console.log('🔧 Setting up Pinecone index...\n');
  
  try {
    // Create index
    await pinecone.createIndex();
    
    // Initialize connection
    await pinecone.initialize();
    
    // Get stats
    const stats = await pinecone.getStats();
    
    console.log('📊 Index Stats:');
    console.log('- Index Name:', process.env.PINECONE_INDEX_NAME);
    console.log('- Dimension:', stats.dimension || 512);
    console.log('- Total Vectors:', stats.totalVectorCount || 0);
    console.log('- Metric:', 'cosine');
    
    console.log('\n✅ Pinecone setup complete!');
    console.log('💡 Ready to run: npm run sync');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupPinecone()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });