const pinecone = require('./pinecone-client');
const embeddings = require('./embedding-service');
const admin = require('firebase-admin');

class ProductMatcher {
  constructor() {
    this.initializeFirebase();
  }

  initializeFirebase() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
      });
    }
    this.db = admin.firestore();
  }

  async generateProducts(supplyList, userContext) {
    console.log(`\n🔍 [KASBAH'S CHOICE] Starting product matching for ${supplyList.length} items...`);
    console.log(`📊 [DATABASE-INFO] Searching through Pinecone index: ${process.env.PINECONE_INDEX_NAME || 'products-50k'}`);
    
    // Get total product count from database
    try {
      const totalProductsSnapshot = await this.db.collection('products').count().get();
      const totalProducts = totalProductsSnapshot.data().count;
      console.log(`📊 [DATABASE-SIZE] Total products in Firebase: ${totalProducts.toLocaleString()}`);
      console.log(`📊 [SEARCH-SCOPE] Vector search will query against embedded representations of all ${totalProducts.toLocaleString()} products`);
    } catch (error) {
      console.log(`📊 [DATABASE-SIZE] Could not get exact product count, but searching across full product database`);
    }
    
    console.log(`🔬 [SEARCH-METHOD] Using semantic vector search with the following process:`);
    console.log(`   1️⃣ Convert supply item description to 1536-dimensional embedding using OpenAI text-embedding-3-large`);
    console.log(`   2️⃣ Query Pinecone vector database for top 20 most semantically similar products`);
    console.log(`   3️⃣ Apply scoring algorithm: 40% semantic similarity, 30% price, 20% location, 10% lead time`);
    console.log(`   4️⃣ Fetch full product details from Firebase for the best match`);
    console.log(`   5️⃣ Return products ranked by combined relevance score`);
    
    const startTime = Date.now();
    
    // Process in parallel batches
    const batchSize = parseInt(process.env.MAX_PRODUCTS_BATCH) || 10;
    const results = [];
    
    for (let i = 0; i < supplyList.length; i += batchSize) {
      const batch = supplyList.slice(i, i + batchSize);
      console.log(`🔄 [BATCH-PROCESSING] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(supplyList.length/batchSize)} (${batch.length} items)`);
      
      const batchResults = await Promise.all(
        batch.map(item => this.findBestProduct(item, userContext))
      );
      
      results.push(...batchResults);
    }
    
    const totalTime = Date.now() - startTime;
    const successfulMatches = results.filter(r => r !== null).length;
    
    console.log(`✅ [MATCHING-COMPLETE] Processed ${supplyList.length} supply items in ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    console.log(`📊 [MATCH-RESULTS] Found matches for ${successfulMatches}/${supplyList.length} items (${((successfulMatches/supplyList.length)*100).toFixed(1)}% success rate)`);
    
    // Log performance metrics
    console.log('📈 [PERFORMANCE] Cache Stats:', embeddings.getStats());
    
    return results;
  }

  async findBestProduct(supplyItem, userContext) {
    try {
      console.log(`🔍 [ITEM-SEARCH] Finding product for: "${supplyItem.description}"`);
      
      // Get embedding for the supply item
      const embeddingStart = Date.now();
      const embedding = await embeddings.getEmbedding(supplyItem.description);
      const embeddingTime = Date.now() - embeddingStart;
      console.log(`   🧮 [EMBEDDING] Generated ${embedding.length}-dimensional vector in ${embeddingTime}ms`);
      
      // Build filter based on supply item requirements
      const filter = this.buildFilter(supplyItem, userContext);
      console.log(`   🔧 [FILTER] Applied metadata filter:`, JSON.stringify(filter));
      
      // Query Pinecone with detailed logging
      const queryStart = Date.now();
      const matches = await pinecone.query(embedding, 20, filter);
      const queryTime = Date.now() - queryStart;
      
      console.log(`   🎯 [PINECONE-RESULTS] Retrieved ${matches.length}/20 vector matches in ${queryTime}ms`);
      console.log(`   📊 [SEARCH-COVERAGE] This represents the top ${matches.length} most semantically similar products from the entire database`);
      
      if (matches.length > 0) {
        const topMatch = matches[0];
        const scoreRanges = {
          excellent: matches.filter(m => m.score >= 0.8).length,
          good: matches.filter(m => m.score >= 0.6 && m.score < 0.8).length,
          fair: matches.filter(m => m.score >= 0.4 && m.score < 0.6).length,
          poor: matches.filter(m => m.score < 0.4).length
        };
        
        console.log(`   📈 [MATCH-QUALITY] Score distribution: ${scoreRanges.excellent} excellent (≥0.8), ${scoreRanges.good} good (0.6-0.8), ${scoreRanges.fair} fair (0.4-0.6), ${scoreRanges.poor} poor (<0.4)`);
        console.log(`   🥇 [TOP-MATCH] Product: ${topMatch.id}, Vector similarity: ${topMatch.score?.toFixed(4)}`);
        
        if (topMatch.metadata) {
          const metadata = topMatch.metadata;
          console.log(`   📋 [METADATA] Name: "${metadata.name || 'N/A'}", Price: $${metadata.price || 'N/A'}, Category: "${metadata.category || 'N/A'}"`);
        }
      } else {
        console.warn(`❌ [NO-MATCHES] No vector matches found for: "${supplyItem.description}"`);
        console.warn(`   💡 [SUGGESTION] Try broadening search terms or check if product exists in database`);
        return null;
      }
      
      // Score and rank matches with detailed logging
      console.log(`   🔢 [SCORING] Applying weighted algorithm to ${matches.length} matches...`);
      const scoredMatches = this.scoreMatches(matches, supplyItem, userContext);
      
      // Get full product details from Firestore for top match
      const topMatch = scoredMatches[0];
      console.log(`   🔍 [FIRESTORE-LOOKUP] Fetching full product details for: ${topMatch.id}`);
      
      const firestoreStart = Date.now();
      const productDoc = await this.db.collection('products').doc(topMatch.id).get();
      const firestoreTime = Date.now() - firestoreStart;
      
      if (!productDoc.exists) {
        console.warn(`❌ [FIRESTORE-ERROR] Product ${topMatch.id} not found in Firebase (${firestoreTime}ms)`);
        console.warn(`   ⚠️  [DATA-SYNC-ISSUE] Vector exists in Pinecone but product missing from Firebase`);
        return null;
      }
      
      const productData = productDoc.data();
      console.log(`   ✅ [MATCH-FOUND] Product: "${productData.name}" (${firestoreTime}ms lookup)`);
      console.log(`   🎯 [FINAL-SCORES] Vector: ${topMatch.score?.toFixed(4)}, Combined: ${topMatch.finalScore.toFixed(4)}`);
      console.log(`   💰 [PRODUCT-INFO] Price: $${productData.price || 'N/A'}, Supplier: ${productData.supplierId || 'N/A'}`);
      
      return {
        id: productDoc.id,  // Include the Firebase document ID
        ...productData,
        matchScore: topMatch.finalScore,
        vectorScore: topMatch.score
      };
      
    } catch (error) {
      console.error(`❌ [SEARCH-ERROR] Error finding product for "${supplyItem.description}":`, error);
      console.error(`   🔍 [DEBUG-INFO] This may indicate Pinecone connectivity issues or embedding service problems`);
      return null;
    }
  }

  buildFilter(supplyItem, userContext) {
    const filter = {};
    
    // Be more lenient with filtering initially to get better matches
    // Scoring will handle the precise requirements
    
    // Only add category filter if it's very specific
    if (supplyItem.category && supplyItem.category.length > 10) {
      filter.category = { $eq: supplyItem.category };
    }
    
    // Only filter by quantity if it's very large to avoid missing good matches
    if (supplyItem.minQuantity && supplyItem.minQuantity > 1000) {
      filter.availableQty = { $gte: supplyItem.minQuantity };
    }
    
    // Only filter by lead time if it's very restrictive
    if (supplyItem.maxLeadTime && supplyItem.maxLeadTime < 5) {
      filter.leadTime = { $lte: supplyItem.maxLeadTime };
    }
    
    console.log(`   🔧 Lenient filter applied for better matching:`, JSON.stringify(filter));
    
    return filter;
  }

  scoreMatches(matches, supplyItem, userContext) {
    return matches.map(match => {
      const metadata = match.metadata || {};
      
      // Calculate component scores
      const vectorScore = match.score || 0;
      const priceScore = this.calculatePriceScore(metadata.price, supplyItem.targetPrice);
      const locationScore = this.calculateLocationScore(metadata, userContext);
      const leadTimeScore = this.calculateLeadTimeScore(metadata.leadTime, supplyItem.maxLeadTime);
      
      // Weighted final score
      const finalScore = 
        vectorScore * 0.4 +      // 40% semantic similarity
        priceScore * 0.3 +       // 30% price
        locationScore * 0.2 +    // 20% location
        leadTimeScore * 0.1;     // 10% lead time
      
      return {
        ...match,
        finalScore,
        scores: {
          vector: vectorScore,
          price: priceScore,
          location: locationScore,
          leadTime: leadTimeScore
        }
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }

  calculatePriceScore(actualPrice, targetPrice) {
    if (!actualPrice || !targetPrice) return 0.5;
    const ratio = actualPrice / targetPrice;
    if (ratio <= 1) return 1; // Under budget is perfect
    if (ratio > 2) return 0; // Over 2x budget is bad
    return 2 - ratio; // Linear decay from 1 to 0
  }

  calculateLocationScore(metadata, userContext) {
    if (!metadata.geohash || !userContext?.location?.geohash) return 0.5;
    
    // Compare geohash prefixes (more matching chars = closer)
    const productGeohash = metadata.geohash;
    const userGeohash = userContext.location.geohash;
    
    let matchingChars = 0;
    for (let i = 0; i < Math.min(productGeohash.length, userGeohash.length); i++) {
      if (productGeohash[i] === userGeohash[i]) {
        matchingChars++;
      } else {
        break;
      }
    }
    
    return matchingChars / 8; // Normalize to 0-1 (8 chars = very precise)
  }

  calculateLeadTimeScore(actualLeadTime, maxLeadTime) {
    if (!actualLeadTime) return 0.5;
    if (!maxLeadTime) return 1;
    if (actualLeadTime <= maxLeadTime) return 1;
    if (actualLeadTime > maxLeadTime * 2) return 0;
    return 2 - (actualLeadTime / maxLeadTime);
  }
}

module.exports = new ProductMatcher();