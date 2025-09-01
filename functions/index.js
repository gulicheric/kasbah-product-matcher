const express = require('express');
const productMatcher = require('../lib/product-matcher');
require('dotenv').config();

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'kasbah-product-matcher',
    version: '1.0.0'
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
    const results = await productMatcher.generateProducts(supplyList, userContext);
    
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
    
    const results = await productMatcher.generateProducts(testSupplyList, testContext);
    
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