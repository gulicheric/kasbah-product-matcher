// Simple test without Redis dependency
const { OpenAI } = require('openai');
require('dotenv').config();

async function simpleTest() {
  console.log('🧪 Simple API Test\n');
  
  try {
    // Test OpenAI embedding directly
    console.log('Testing OpenAI connection...');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'medical supplies test',
      dimensions: 512
    });
    
    const embedding = response.data[0].embedding;
    console.log(`✅ Generated embedding: ${embedding.length} dimensions`);
    console.log(`   Sample values: [${embedding.slice(0, 3).map(n => n.toFixed(4)).join(', ')}...]`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

simpleTest()
  .then(() => {
    console.log('\n✅ Simple test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });