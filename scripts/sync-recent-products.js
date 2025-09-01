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

async function syncRecentProducts() {
  console.log('🚀 Starting Pinecone sync for products created after July 1, 2025...\n');

  // Create July 1, 2025 timestamp
  const july1_2025 = new Date('2025-07-01T00:00:00Z');
  const cutoffTimestamp = admin.firestore.Timestamp.fromDate(july1_2025);
  
  console.log('📅 Syncing products created after:', july1_2025.toISOString());

  // Create index if it doesn't exist
  await pinecone.createIndex();
  await pinecone.initialize();

  const BATCH_SIZE = 25; // Smaller batches to avoid timeout
  let processed = 0;
  let lastDoc = null;
  let totalFound = 0;

  // Get initial stats
  const initialStats = await pinecone.getStats();
  console.log('Initial vectors in index:', initialStats.totalRecordCount || 0);

  while (true) {
    // Query products created after July 1, 2025
    let query = db.collection('products')
      .where('createdAt', '>', cutoffTimestamp)
      .orderBy('createdAt')
      .limit(BATCH_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    // Fetch batch
    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log(`\n✅ Sync complete! Processed ${processed} products created after July 1, 2025`);
      break;
    }

    totalFound += snapshot.docs.length;
    console.log(`📦 Found batch of ${snapshot.docs.length} products (total found: ${totalFound})`);

    // Prepare vectors
    const vectors = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Skip if no name or description
      if (!data.name && !data.description) {
        console.log(`⚠️  Skipping product ${doc.id} - no name or description`);
        continue;
      }

      console.log(`📝 Processing: ${data.name || 'Unnamed'} (${doc.id})`);

      // Generate embedding
      const description = [
        data.name,
        data.description, 
        data.category,
        data.manufacturer,
        data.brand
      ].filter(Boolean).join(' ');

      let embedding;
      try {
        embedding = await embeddings.getEmbedding(description);
      } catch (error) {
        console.log(`❌ Failed to generate embedding for ${doc.id}:`, error.message);
        continue;
      }

      // Prepare metadata for Pinecone
      const metadata = {
        name: data.name || '',
        category: data.category || '',
        price: data.price || 0,
        availableQty: data.availableQty || data.quantity || 0,
        leadTime: data.leadTime || 7,
        location: data.location || '',
        geohash: data.geohash || '',
        lastUpdated: new Date().toISOString()
      };

      // Prepare vector for Pinecone
      vectors.push({
        id: doc.id,
        values: embedding,
        metadata: metadata
      });

      processed++;
    }

    // Upload batch to Pinecone
    if (vectors.length > 0) {
      try {
        await pinecone.upsertBatch(vectors);
        console.log(`✅ Uploaded ${vectors.length} products to Pinecone`);
        
        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`❌ Failed to upload batch to Pinecone:`, error.message);
      }
    }

    // Update progress
    console.log(`Processed: ${processed} products (${((processed/totalFound)*100).toFixed(1)}%)`);

    // Set last document for pagination
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  // Final stats
  const finalStats = await pinecone.getStats();
  const cacheStats = embeddings.getStats();
  
  console.log('\n📊 Sync Complete!');
  console.log('Total vectors in index:', finalStats.totalRecordCount);
  console.log('Dimensions:', finalStats.dimension);
  console.log('Cache stats:', cacheStats);

  console.log('\n✅ Recent products sync completed successfully!');
}

// Run the sync
syncRecentProducts().catch(error => {
  console.error('❌ Sync failed:', error);
  process.exit(1);
});