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

async function syncProducts() {
  console.log('🚀 Starting Pinecone sync for products (test with 500 products)...\n');

  // Create index if it doesn't exist
  await pinecone.createIndex();
  await pinecone.initialize();

  const BATCH_SIZE = 50;
  const MAX_PRODUCTS = 500; // Limit for testing
  let processed = 0;
  let lastDoc = null;

  // Get initial stats
  const initialStats = await pinecone.getStats();
  console.log('Initial vectors in index:', initialStats.totalRecordCount || 0);

  while (true) {
    // Simple query without complex filtering for initial test
    let query = db.collection('products')
      .orderBy('__name__')
      .limit(BATCH_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    // Fetch batch
    const snapshot = await query.get();

    if (snapshot.empty || processed >= MAX_PRODUCTS) {
      console.log(`\n✅ Sync complete (processed ${processed} products)`);
      break;
    }

    // Prepare vectors
    const vectors = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Generate embedding if not exists
      let embedding = data.embedding;
      if (!embedding) {
        const description = data.description || data.name || '';
        embedding = await embeddings.getEmbedding(description);

        // Optionally save embedding back to Firestore
        await doc.ref.update({ embedding });
      }

      // Prepare vector for Pinecone
      vectors.push({
        id: doc.id,
        values: embedding,
        metadata: {
          name: data.name,
          category: data.category,
          supplierId: data.supplier?.id,
          price: data.price,
          availableQty: data.availableQty || 0,
          leadTime: data.leadTime || 7,
          geohash: data.geohash || '',
          location: data.location || '',
          lastUpdated: new Date().toISOString()
        }
      });
    }

    // Upsert to Pinecone
    await pinecone.upsertBatch(vectors);

    processed += vectors.length;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];

    // Progress update
    console.log(`Processed: ${processed} products (${(processed / 50000 * 100).toFixed(1)}%)`);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Final stats
  const finalStats = await pinecone.getStats();
  console.log('\n📊 Sync Complete!');
  console.log('Total vectors in index:', finalStats.totalRecordCount || 0);
  console.log('Dimensions:', finalStats.dimension || 512);
  console.log('Cache stats:', embeddings.getStats());
}

// Run sync
syncProducts()
  .then(() => {
    console.log('\n✅ Sync completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  });