const productMatcher = require('../lib/product-matcher');
require('dotenv').config();

async function runTest() {
  console.log('🧪 Testing Product Matching System\n');
  
  // Test supply list
  const supplyList = [
    {
      description: "stainless steel bolts M8 x 50mm",
      category: "fasteners",
      minQuantity: 500,
      targetPrice: 100,
      maxLeadTime: 14
    },
    {
      description: "industrial grade wood screws #10",
      category: "fasteners",
      minQuantity: 1000,
      targetPrice: 75,
      maxLeadTime: 7
    },
    {
      description: "aluminum sheet 3mm thickness",
      category: "raw-materials",
      minQuantity: 10,
      targetPrice: 500,
      maxLeadTime: 21
    }
  ];
  
  const userContext = {
    location: {
      geohash: "9q8yyk",
      city: "San Francisco",
      state: "CA"
    },
    preferences: {
      preferredSuppliers: [],
      excludedSuppliers: []
    }
  };
  
  console.log('Supply List:', supplyList.length, 'items\n');
  
  const startTime = Date.now();
  const results = await productMatcher.generateProducts(supplyList, userContext);
  const endTime = Date.now();
  
  console.log('\n📊 Results:');
  results.forEach((product, index) => {
    if (product) {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   Match Score: ${(product.matchScore * 100).toFixed(1)}%`);
      console.log(`   Price: ${product.price}`);
      console.log(`   Available: ${product.availableQty}`);
      console.log(`   Lead Time: ${product.leadTime} days`);
    } else {
      console.log(`\n${index + 1}. No match found`);
    }
  });
  
  console.log(`\n⏱️ Total processing time: ${endTime - startTime}ms`);
}

runTest()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });