// Test with real medical supply queries
const axios = require('axios');

async function testRealQueries() {
  console.log('🧪 Testing Real Medical Supply Queries\n');
  
  const testQueries = [
    {
      name: "Surgical Scissors",
      query: {
        supplyList: [{
          description: "surgical scissors stainless steel curved",
          category: "surgical-instruments",
          targetPrice: 50,
          minQuantity: 5,
          maxLeadTime: 14
        }],
        userContext: {
          location: {
            city: "San Francisco",
            state: "CA"
          },
          userId: "test-user"
        }
      }
    },
    {
      name: "Medical Gloves",
      query: {
        supplyList: [{
          description: "nitrile exam gloves powder free",
          category: "ppe",
          targetPrice: 25,
          minQuantity: 100,
          maxLeadTime: 7
        }],
        userContext: {
          location: {
            city: "Los Angeles", 
            state: "CA"
          }
        }
      }
    },
    {
      name: "Surgical Mask",
      query: {
        supplyList: [{
          description: "surgical mask 3-ply disposable",
          category: "ppe",
          targetPrice: 15,
          minQuantity: 50
        }],
        userContext: {
          userId: "test-user-2"
        }
      }
    }
  ];
  
  for (let i = 0; i < testQueries.length; i++) {
    const test = testQueries[i];
    console.log(`${i + 1}. Testing: ${test.name}`);
    console.log(`   Query: "${test.query.supplyList[0].description}"`);
    console.log(`   Target Price: $${test.query.supplyList[0].targetPrice}`);
    
    try {
      const startTime = Date.now();
      
      const response = await axios.post('http://localhost:8080/generate-products', test.query, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.data.success && response.data.products[0]) {
        const product = response.data.products[0];
        console.log(`   ✅ Match found in ${responseTime}ms`);
        console.log(`   📦 Product: ${product.name}`);
        console.log(`   💰 Price: $${product.price}`);
        console.log(`   📊 Match Score: ${(product.matchScore * 100).toFixed(1)}%`);
        console.log(`   🏭 Category: ${product.category || 'N/A'}`);
        console.log(`   📦 Available: ${product.availableQty || 'N/A'}`);
      } else {
        console.log(`   ⚠️ No match found (${responseTime}ms)`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log(''); // Empty line
  }
}

// Add axios if not already installed
try {
  require.resolve('axios');
} catch (e) {
  console.log('Installing axios...');
  require('child_process').execSync('npm install axios', { stdio: 'inherit' });
}

testRealQueries()
  .then(() => {
    console.log('✅ Real query test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });