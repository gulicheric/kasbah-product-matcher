// Explore what products we actually have in the database
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

async function exploreProducts() {
  console.log('🔍 Exploring Product Database\n');
  
  try {
    // Get some sample products
    console.log('Sample products in database:');
    const snapshot = await db.collection('products').limit(10).get();
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. ${data.name || 'Unnamed Product'}`);
      console.log(`   Description: ${data.description || 'N/A'}`);
      console.log(`   Price: $${data.price || 'N/A'}`);
      console.log(`   Category: ${data.category || 'N/A'}`);
      console.log(`   Available: ${data.availableQty || 'N/A'}`);
      console.log(`   Has embedding: ${data.embedding ? 'Yes' : 'No'}`);
    });
    
    // Get categories
    console.log('\n📊 Product Categories:');
    const categories = new Map();
    const categorySnapshot = await db.collection('products')
      .where('category', '!=', null)
      .limit(100)
      .get();
    
    categorySnapshot.forEach(doc => {
      const category = doc.data().category;
      if (category) {
        categories.set(category, (categories.get(category) || 0) + 1);
      }
    });
    
    const sortedCategories = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedCategories.forEach(([category, count]) => {
      console.log(`   ${category}: ${count} products`);
    });
    
    // Search for common medical terms
    console.log('\n🔎 Searching for common medical terms:');
    const searchTerms = ['catheter', 'gloves', 'syringe', 'mask', 'bandage', 'thermometer'];
    
    for (const term of searchTerms) {
      const results = await db.collection('products')
        .where('name', '>=', term.toLowerCase())
        .where('name', '<', term.toLowerCase() + '\uf8ff')
        .limit(3)
        .get();
        
      if (!results.empty) {
        console.log(`\n   "${term}" matches:`);
        results.forEach(doc => {
          const data = doc.data();
          console.log(`     • ${data.name} - $${data.price}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error exploring products:', error.message);
  }
}

exploreProducts()
  .then(() => {
    console.log('\n✅ Product exploration completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Exploration failed:', error);
    process.exit(1);
  });