const admin = require('firebase-admin');
const pinecone = require('../lib/pinecone-client');
const embeddings = require('../lib/embedding-service');
require('dotenv').config();

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

const db = admin.firestore();

async function testFirebaseConnection() {
  console.log('🧪 Testing Firebase Connection & Product Data\n');
  
  try {
    console.log('Testing Firebase connection...');
    
    // Get a few sample products
    const snapshot = await db.collection('products').limit(3).get();
    
    if (snapshot.empty) {
      console.log('⚠️  No products found in Firebase');
      return;
    }
    
    console.log(`✅ Found ${snapshot.size} sample products`);
    
    // Test embedding generation for sample products
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const description = data.description || data.name || 'Unknown product';
      
      console.log(`\n📦 Product: ${description.substring(0, 50)}...`);
      
      // Generate embedding (this will use memory cache since Redis is down)
      const start = Date.now();
      const embedding = await embeddings.getEmbedding(description);
      const time = Date.now() - start;
      
      console.log(`   ✅ Generated embedding in ${time}ms`);
      console.log(`   📊 Dimensions: ${embedding.length}`);
      console.log(`   💰 Price: $${data.price || 'N/A'}`);
      console.log(`   📂 Category: ${data.category || 'N/A'}`);
    }
    
    // Show cache stats
    const stats = embeddings.getStats();
    console.log(`\n📊 Embedding Cache Stats:`);
    console.log(`   Generated: ${stats.generated}`);
    console.log(`   Hits: ${stats.hits}`);
    console.log(`   Hit Rate: ${stats.hitRate}`);
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error.message);
    throw error;
  }
}

testFirebaseConnection()
  .then(() => {
    console.log('\n✅ Firebase test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });