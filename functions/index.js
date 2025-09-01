const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

// Lazy load product matcher to avoid initialization issues on startup
let productMatcher;
const getProductMatcher = () => {
  if (!productMatcher) {
    productMatcher = require('../lib/product-matcher');
  }
  return productMatcher;
};

// Health check
app.get('/health', (req, res) => {
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'PINECONE_API_KEY', 
    'PINECONE_INDEX_NAME',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'kasbah-product-matcher',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    envVars: {
      configured: requiredEnvVars.length - missingEnvVars.length,
      missing: missingEnvVars.length,
      missingVars: missingEnvVars
    }
  });
});

// Main product matching endpoint
app.post('/generate-products', async (req, res) => {
  try {
    const { supplyList, userContext } = req.body;
    
    if (!supplyList || !Array.isArray(supplyList)) {
      return res.status(400).json({
        error: 'Invalid request: supplyList must be an array'
      });
    }
    
    if (supplyList.length > 20) {
      return res.status(400).json({
        error: 'Maximum 20 products per request'
      });
    }
    
    const startTime = Date.now();
    
    // Generate matches
    const matcher = getProductMatcher();
    const results = await matcher.generateProducts(supplyList, userContext);
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      products: results,
      metadata: {
        processingTime: `${processingTime}ms`,
        itemsProcessed: supplyList.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in generate-products:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Test endpoint
app.post('/test-match', async (req, res) => {
  try {
    const testSupplyList = [
      {
        description: "organic steel screws 1/4 inch",
        category: "hardware",
        minQuantity: 100,
        targetPrice: 50,
        maxLeadTime: 7
      }
    ];
    
    const testContext = {
      location: {
        geohash: "9q8yyk",
        city: "San Francisco"
      },
      userId: "test-user"
    };
    
    const matcher = getProductMatcher();
    const results = await matcher.generateProducts(testSupplyList, testContext);
    
    res.json({
      success: true,
      testResults: results
    });
    
  } catch (error) {
    console.error('Test match error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Test at: http://localhost:${PORT}/test-match`);
});