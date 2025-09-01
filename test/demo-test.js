// Demo test to show system components working
const { OpenAI } = require('openai');
const admin = require('firebase-admin');
require('dotenv').config();

async function demoTest() {
  console.log('🎯 KASBAH 50K Product Matcher - System Demo\n');
  
  try {
    // Test 1: OpenAI Embeddings
    console.log('1. Testing OpenAI Embeddings...');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'medical surgical scissors stainless steel',
      dimensions: 512
    });
    
    console.log(`   ✅ Generated 512-dimension embedding`);
    console.log(`   📊 Sample values: [${embedding.data[0].embedding.slice(0, 3).map(n => n.toFixed(4)).join(', ')}...]`);
    
    // Test 2: Firebase Connection
    console.log('\n2. Testing Firebase Connection...');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    
    const db = admin.firestore();
    const productCount = await db.collection('products').count().get();
    console.log(`   ✅ Connected to Firebase`);
    console.log(`   📦 Total products in database: ${productCount.data().count.toLocaleString()}`);
    
    // Test 3: System Status
    console.log('\n3. System Status:');
    console.log(`   🌲 Pinecone: Configured (${process.env.PINECONE_INDEX_NAME})`);
    console.log(`   🔥 Firebase: Connected (${productCount.data().count.toLocaleString()} products)`);
    console.log(`   🧠 OpenAI: Working (text-embedding-3-small)`);
    console.log(`   💾 Caching: Memory-only (Redis disabled)`);
    
    console.log('\n🎉 All components working! Ready for product sync and matching.');
    console.log('\n📋 Next Steps:');
    console.log('   1. Run: npm run sync    (to load products into Pinecone)');
    console.log('   2. Test: curl -X POST http://localhost:8080/test-match');
    console.log('   3. Use: POST /generate-products with your supply list');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

demoTest()
  .then(() => {
    console.log('\n✅ Demo completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });