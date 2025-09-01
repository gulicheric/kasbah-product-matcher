// Debug Pinecone connection and query directly
const pinecone = require('../lib/pinecone-client');
const embeddings = require('../lib/embedding-service');
require('dotenv').config();

async function debugPinecone() {
  console.log('🐛 Debugging Pinecone Connection\n');
  
  try {
    // Initialize and check stats
    await pinecone.initialize();
    const stats = await pinecone.getStats();
    
    console.log('📊 Pinecone Index Stats:');
    console.log(`   Total Records: ${stats.totalRecordCount || 0}`);
    console.log(`   Dimensions: ${stats.dimension || 'Unknown'}`);
    console.log(`   Namespaces: ${JSON.stringify(stats.namespaces || {})}`);
    
    if (stats.totalRecordCount === 0) {
      console.log('\n❌ Index is empty! This explains why no matches are found.');
      return;
    }
    
    // Test embedding generation
    console.log('\n🧠 Testing Embedding Generation:');
    const testText = "insulin syringe";
    const embedding = await embeddings.getEmbedding(testText);
    console.log(`   Text: "${testText}"`);
    console.log(`   Dimensions: ${embedding.length}`);
    console.log(`   Sample values: [${embedding.slice(0, 3).map(n => n.toFixed(4)).join(', ')}...]`);
    
    // Test direct Pinecone query
    console.log('\n🔍 Testing Direct Pinecone Query:');
    console.log('   Querying with no filters for top 5 matches...');
    
    const matches = await pinecone.query(embedding, 5, {}); // No filters
    
    console.log(`   Found ${matches.length} matches:`);
    matches.forEach((match, index) => {
      console.log(`   ${index + 1}. ID: ${match.id}`);
      console.log(`      Score: ${match.score?.toFixed(4) || 'N/A'}`);
      console.log(`      Metadata: ${JSON.stringify(match.metadata || {})}`);
    });
    
    if (matches.length === 0) {
      console.log('\n❌ Even direct query with no filters returns no matches!');
      console.log('   This suggests either:');
      console.log('   1. Index is actually empty despite stats');
      console.log('   2. Dimension mismatch');
      console.log('   3. Query formatting issue');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugPinecone()
  .then(() => {
    console.log('\n✅ Debug completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Debug failed:', error);
    process.exit(1);
  });