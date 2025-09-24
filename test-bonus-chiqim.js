const axios = require('axios');

const API_URL = 'http://localhost:3000';

// Test data
const testData = {
  cashierId: 1, // Current user ID from localStorage
  selectedUserId: 2, // Selected salesperson ID
  productData: {
    id: 1,
    name: 'Test Product',
    marketPrice: 100,
    bonusPercentage: 10, // 10% bonus
    quantity: 2
  },
  sellingPrice: 150 // Selling above market price to trigger bonus
};

async function testBonusInChiqim() {
  try {
    console.log('🧪 Testing Bonus System in Chiqim.jsx...\n');

    // Create a test transaction similar to Chiqim.jsx
    const transactionData = {
      type: 'SALE',
      paymentType: 'CASH',
      cashierId: testData.cashierId,
      soldByUserId: testData.selectedUserId,
      fromBranchId: 1,
      customer: {
        fullName: 'Test Customer',
        phone: '998901234567'
      },
      items: [{
        productId: testData.productData.id,
        productName: testData.productData.name,
        quantity: testData.productData.quantity,
        price: testData.sellingPrice,
        sellingPrice: testData.sellingPrice,
        originalPrice: testData.productData.marketPrice,
        total: testData.productData.quantity * testData.sellingPrice,
        product: {
          name: testData.productData.name,
          bonusPercentage: testData.productData.bonusPercentage
        }
      }]
    };

    console.log('📤 Sending transaction data:');
    console.log(JSON.stringify(transactionData, null, 2));

    // Send transaction to backend
    const response = await axios.post(`${API_URL}/transactions`, transactionData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    console.log('\n✅ Transaction created successfully!');
    console.log('Transaction ID:', response.data.id);

    // Check if bonus was created
    console.log('\n🔍 Checking bonuses for salesperson...');
    
    const bonusResponse = await axios.get(`${API_URL}/bonuses/user/${testData.selectedUserId}`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    console.log('📊 Bonuses found:', bonusResponse.data.length);
    
    if (bonusResponse.data.length > 0) {
      const latestBonus = bonusResponse.data[0];
      console.log('💰 Latest bonus details:');
      console.log(`   Amount: ${latestBonus.amount} som`);
      console.log(`   Reason: ${latestBonus.reason}`);
      console.log(`   Description: ${latestBonus.description}`);
      console.log(`   Created by: User ID ${latestBonus.createdById}`);
      console.log(`   For salesperson: User ID ${latestBonus.userId}`);
      
      // Calculate expected bonus
      const priceDifference = (testData.sellingPrice - testData.productData.marketPrice) * testData.productData.quantity;
      const expectedBonus = priceDifference * (testData.productData.bonusPercentage / 100);
      
      console.log(`\n📈 Bonus calculation verification:`);
      console.log(`   Price difference: (${testData.sellingPrice} - ${testData.productData.marketPrice}) × ${testData.productData.quantity} = ${priceDifference} som`);
      console.log(`   Expected bonus: ${priceDifference} × ${testData.productData.bonusPercentage}% = ${expectedBonus} som`);
      console.log(`   Actual bonus: ${latestBonus.amount} som`);
      console.log(`   ✅ Match: ${expectedBonus === latestBonus.amount ? 'YES' : 'NO'}`);
    } else {
      console.log('❌ No bonuses found! Bonus system may not be working.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Possible issues:');
      console.log('   - Backend server not running on port 3000');
      console.log('   - API endpoints not available');
      console.log('   - Database connection issues');
    }
    
    if (error.response?.status === 400) {
      console.log('\n💡 Possible issues:');
      console.log('   - Invalid transaction data structure');
      console.log('   - Missing required fields');
      console.log('   - Product or user not found in database');
    }
  }
}

// Run the test
testBonusInChiqim();
