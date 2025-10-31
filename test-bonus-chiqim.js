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


    // Send transaction to backend
    const response = await axios.post(`${API_URL}/transactions`, transactionData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });



    
    const bonusResponse = await axios.get(`${API_URL}/bonuses/user/${testData.selectedUserId}`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });


    
    if (bonusResponse.data.length > 0) {
      const latestBonus = bonusResponse.data[0];

      
      // Calculate expected bonus
      const priceDifference = (testData.sellingPrice - testData.productData.marketPrice) * testData.productData.quantity;
      const expectedBonus = priceDifference * (testData.productData.bonusPercentage / 100);
      

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
