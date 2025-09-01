// Test matching with products that actually exist in our database
const axios = require('axios');

async function testExistingProducts() {
  console.log('🎯 Testing with Products That Actually Exist\n');
  
  const testQueries = [
    {
      name: "Insulin Syringe (exact match)",
      query: {
        supplyList: [{
          description: "insulin syringes ultiguard safe pack",
          targetPrice: 70,
          minQuantity: 50
        }],
        userContext: {
          userId: "test-user"
        }
      }
    },
    {
      name: "Breast Pump (partial match)",
      query: {
        supplyList: [{
          description: "breast pumping starter set",
          targetPrice: 50,
          minQuantity: 1
        }]
      }
    },
    {
      name: "Commode (medical equipment)",
      query: {
        supplyList: [{
          description: "bedside commode bariatric",
          targetPrice: 800,
          minQuantity: 1
        }]
      }
    },
    {
      name: "Sore Throat Spray (OTC)",
      query: {
        supplyList: [{
          description: "sore throat spray menthol",
          targetPrice: 8,
          minQuantity: 10
        }]
      }
    },
    {
      name: "Reading Glasses",
      query: {
        supplyList: [{
          description: "reading glasses 2.25",
          targetPrice: 10,
          minQuantity: 5
        }]
      }
    }
  ];
  
  console.log('Testing with semantic similarity to actual products in our database...\n');
  
  for (let i = 0; i < testQueries.length; i++) {
    const test = testQueries[i];
    console.log(`${i + 1}. ${test.name}`);
    console.log(`   Query: "${test.query.supplyList[0].description}"`);
    console.log(`   Target Price: $${test.query.supplyList[0].targetPrice}`);
    
    try {
      const startTime = Date.now();
      
      const response = await axios.post('http://localhost:8080/generate-products', test.query, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.data.success && response.data.products[0]) {
        const product = response.data.products[0];
        console.log(`   ✅ MATCH FOUND in ${responseTime}ms`);
        console.log(`   📦 Product: ${product.name}`);
        console.log(`   💰 Price: $${product.price}`);
        console.log(`   📊 Match Score: ${(product.matchScore * 100).toFixed(1)}%`);
        console.log(`   🔍 Vector Score: ${(product.vectorScore * 100).toFixed(1)}%`);
        console.log(`   📂 Category: ${product.category || 'N/A'}`);
        
        // Show price comparison
        const targetPrice = test.query.supplyList[0].targetPrice;
        const actualPrice = product.price;
        const priceRatio = (actualPrice / targetPrice).toFixed(2);
        console.log(`   💹 Price Ratio: ${priceRatio}x target (${actualPrice > targetPrice ? 'over' : 'under'} budget)`);
        
      } else {
        console.log(`   ⚠️ No match found (${responseTime}ms)`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.response?.data) {
        console.log(`   Details: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    console.log(''); // Empty line
  }
}

testExistingProducts()
  .then(() => {
    console.log('🎉 Matching test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });