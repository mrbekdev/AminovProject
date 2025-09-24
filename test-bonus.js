const { PrismaClient } = require('@prisma/client');

async function testBonusSystem() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing Prisma Bonus model...');
    
    // Test if we can query the Bonus model
    const bonuses = await prisma.bonus.findMany({
      take: 1
    });
    
    console.log('✅ Bonus model is accessible');
    console.log('Existing bonuses count:', bonuses.length);
    
    // Test if we can query products with bonusPercentage
    const productsWithBonus = await prisma.product.findMany({
      where: {
        bonusPercentage: {
          gt: 0
        }
      },
      take: 5
    });
    
    console.log('✅ Products with bonus percentage:', productsWithBonus.length);
    productsWithBonus.forEach(p => {
      console.log(`  - ${p.name}: ${p.bonusPercentage}%`);
    });
    
    // Test transaction with items and product data
    const recentTransaction = await prisma.transaction.findFirst({
      where: {
        type: 'SALE'
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (recentTransaction) {
      console.log('✅ Recent transaction found:', recentTransaction.id);
      console.log('Items count:', recentTransaction.items.length);
      recentTransaction.items.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`);
        console.log(`    Product: ${item.product?.name || 'Unknown'}`);
        console.log(`    Selling Price: ${item.sellingPrice}`);
        console.log(`    Original Price: ${item.originalPrice}`);
        console.log(`    Bonus %: ${item.product?.bonusPercentage || 0}`);
      });
    } else {
      console.log('❌ No recent transactions found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testBonusSystem();
