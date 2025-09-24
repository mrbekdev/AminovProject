const { PrismaClient } = require('@prisma/client');

async function testBonusSystem() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing Bonus System...\n');
    
    // 1. Check if products have bonus percentages
    console.log('1. Checking products with bonus percentages...');
    const productsWithBonus = await prisma.product.findMany({
      where: {
        bonusPercentage: {
          gt: 0
        }
      },
      select: {
        id: true,
        name: true,
        price: true,
        marketPrice: true,
        bonusPercentage: true
      },
      take: 5
    });
    
    console.log(`Found ${productsWithBonus.length} products with bonus percentages:`);
    productsWithBonus.forEach(p => {
      console.log(`  - ${p.name}: Price=${p.price}, Market=${p.marketPrice}, Bonus=${p.bonusPercentage}%`);
    });
    
    // 2. Check recent sales transactions
    console.log('\n2. Checking recent sales transactions...');
    const recentSales = await prisma.transaction.findMany({
      where: {
        type: 'SALE'
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                bonusPercentage: true
              }
            }
          }
        },
        soldBy: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    });
    
    console.log(`Found ${recentSales.length} recent sales:`);
    recentSales.forEach((tx, i) => {
      console.log(`\n  Transaction ${i + 1} (ID: ${tx.id}):`);
      console.log(`    Sold by: ${tx.soldBy?.username || 'Unknown'} (ID: ${tx.soldByUserId})`);
      console.log(`    Items: ${tx.items.length}`);
      
      tx.items.forEach((item, j) => {
        const bonusEligible = item.sellingPrice > item.originalPrice && item.product?.bonusPercentage > 0;
        console.log(`      Item ${j + 1}: ${item.product?.name || 'Unknown'}`);
        console.log(`        Selling: ${item.sellingPrice}, Original: ${item.originalPrice}`);
        console.log(`        Bonus %: ${item.product?.bonusPercentage || 0}%`);
        console.log(`        Bonus eligible: ${bonusEligible ? '✅' : '❌'}`);
        
        if (bonusEligible) {
          const priceDiff = (item.sellingPrice - item.originalPrice) * item.quantity;
          const bonusAmount = priceDiff * (item.product.bonusPercentage / 100);
          console.log(`        Expected bonus: ${bonusAmount} som`);
        }
      });
    });
    
    // 3. Check existing bonuses
    console.log('\n3. Checking existing bonuses...');
    const bonuses = await prisma.bonus.findMany({
      where: {
        reason: 'SALES_BONUS'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    console.log(`Found ${bonuses.length} sales bonuses:`);
    bonuses.forEach((bonus, i) => {
      console.log(`  Bonus ${i + 1}: ${bonus.amount} som to ${bonus.user?.username || 'Unknown'}`);
      console.log(`    Date: ${bonus.bonusDate}`);
      console.log(`    Description: ${bonus.description}`);
    });
    
    // 4. Test bonus calculation manually
    console.log('\n4. Manual bonus calculation test...');
    if (productsWithBonus.length > 0) {
      const testProduct = productsWithBonus[0];
      const sellingPrice = testProduct.price + 10000; // Add 10,000 som markup
      const originalPrice = testProduct.marketPrice || testProduct.price;
      const quantity = 2;
      
      if (sellingPrice > originalPrice && testProduct.bonusPercentage > 0) {
        const priceDiff = (sellingPrice - originalPrice) * quantity;
        const bonusAmount = priceDiff * (testProduct.bonusPercentage / 100);
        
        console.log(`Test calculation for ${testProduct.name}:`);
        console.log(`  Selling price: ${sellingPrice} som`);
        console.log(`  Original price: ${originalPrice} som`);
        console.log(`  Quantity: ${quantity}`);
        console.log(`  Price difference: ${priceDiff} som`);
        console.log(`  Bonus percentage: ${testProduct.bonusPercentage}%`);
        console.log(`  Expected bonus: ${bonusAmount} som`);
      }
    }
    
    console.log('\n✅ Bonus system test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBonusSystem();
