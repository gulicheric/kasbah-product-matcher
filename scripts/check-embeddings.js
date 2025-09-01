const admin = require('firebase-admin');
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

async function checkEmbeddings() {
  console.log('🔍 Checking existing product embeddings...\n');
  
  try {
    // Get a few products with embeddings
    const snapshot = await db.collection('products')
      .where('embedding', '!=', null)
      .limit(3)
      .get();
    
    if (snapshot.empty) {
      console.log('❌ No products found with embeddings');
      return;
    }
    
    console.log(`✅ Found ${snapshot.size} products with embeddings`);
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const embedding = data.embedding;
      
      console.log(`\n📦 Product: ${data.name?.substring(0, 50) || 'Unknown'}...`);
      console.log(`   🔢 Embedding dimensions: ${embedding ? embedding.length : 'N/A'}`);
      console.log(`   💰 Price: $${data.price || 'N/A'}`);
      console.log(`   📂 Category: ${data.category || 'N/A'}`);
      
      if (embedding) {
        console.log(`   📊 Sample values: [${embedding.slice(0, 3).map(n => n.toFixed(4)).join(', ')}...]`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkEmbeddings()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });