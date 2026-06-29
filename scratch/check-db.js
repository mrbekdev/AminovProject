const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== STOCK VALUE PER BRANCH ===');

  const branches = await prisma.branch.findMany();

  for (const b of branches) {
    const products = await prisma.product.findMany({
      where: { branchId: b.id, isDeleted: false }
    });
    
    const usdValue = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
    const qty = products.reduce((sum, p) => sum + p.quantity, 0);
    
    console.log(`Branch ${b.id} (${b.name}, type=${b.type}):`);
    console.log(`- Total Qty: ${qty}`);
    console.log(`- USD Value: $${usdValue.toLocaleString()}`);
  }

  // Combined SKLAD branches
  const skladProducts = await prisma.product.findMany({
    where: { branch: { type: 'SKLAD' }, isDeleted: false }
  });
  const skladUsdValue = skladProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
  console.log(`\nAll SKLAD branches combined USD Value: $${skladUsdValue.toLocaleString()}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
