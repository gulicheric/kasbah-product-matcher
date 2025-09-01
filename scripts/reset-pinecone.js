const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

async function resetIndex() {
  console.log('🔄 Resetting Pinecone index for correct dimensions...\n');
  
  try {
    const client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    // Delete existing index
    console.log('Deleting existing index...');
    try {
      await client.deleteIndex(process.env.PINECONE_INDEX_NAME);
      console.log('✅ Existing index deleted');
      
      // Wait for deletion to complete
      console.log('Waiting for deletion to complete...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (error) {
      if (error.message.includes('not found')) {
        console.log('ℹ️ Index already deleted or not found');
      } else {
        throw error;
      }
    }
    
    // Create new index with correct dimensions
    console.log('Creating new index with 1536 dimensions...');
    await client.createIndex({
      name: process.env.PINECONE_INDEX_NAME,
      dimension: 1536,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });
    
    console.log('✅ New index created successfully!');
    console.log(`📊 Index: ${process.env.PINECONE_INDEX_NAME}`);
    console.log('📏 Dimensions: 1536');
    console.log('📐 Metric: cosine');
    
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    throw error;
  }
}

resetIndex()
  .then(() => {
    console.log('\n✅ Index reset complete! Ready to sync.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Reset failed:', error);
    process.exit(1);
  });