// Simple test with exact product name
const axios = require('axios');

async function simpleMatchTest() {
  console.log('🎯 Simple Match Test\n');
  
  // Use the exact product names we saw in the debug output
  const testQuery = {
    supplyList: [{
      description: "BANDAGE CONFORM",  // Very similar to "BANDAGE, CONFORM 2\" STERILE,  12RLS/BX"
      targetPrice: 20,
      minQuantity: 1
    }],
    userContext: {
      userId: "test-user"
    }
  };
  
  console.log('Testing with simplified product name...');
  console.log(`Query: "${testQuery.supplyList[0].description}"`);
  
  try {
    const response = await axios.post('http://localhost:8080/generate-products', testQuery, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    if (response.data.success && response.data.products[0]) {
      const product = response.data.products[0];
      console.log('\n🎉 SUCCESS! Match found:');
      console.log(`Product: ${product.name}`);
      console.log(`Price: $${product.price}`);
      console.log(`Match Score: ${(product.matchScore * 100).toFixed(1)}%`);
    } else {
      console.log('\n❌ No match found');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.log('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

simpleMatchTest();