const embeddings = require('../lib/embedding-service');
require('dotenv').config();

async function basicTest() {
  console.log('🧪 Basic Component Test\n');
  
  try {
    // Test embedding generation
    console.log('Testing embedding generation...');
    const testText = "stainless steel surgical scissors";
    const embedding = await embeddings.getEmbedding(testText);
    
    console.log(`✅ Generated embedding for: "${testText}"`);
    console.log(`   Dimensions: ${embedding.length}`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}]`);
    
    // Test caching
    console.log('\nTesting caching...');
    const start = Date.now();
    const cachedEmbedding = await embeddings.getEmbedding(testText);
    const cacheTime = Date.now() - start;
    
    console.log(`✅ Retrieved from cache in ${cacheTime}ms`);
    
    // Show cache stats
    const stats = embeddings.getStats();
    console.log('\n📊 Cache Stats:');
    console.log(`   Hit Rate: ${stats.hitRate}`);
    console.log(`   Total Hits: ${stats.hits}`);
    console.log(`   Total Generated: ${stats.generated}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

basicTest()
  .then(() => {
    console.log('\n✅ Basic test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });