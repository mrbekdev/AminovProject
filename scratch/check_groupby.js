const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    take: 10
  });

  const soldCounts = await prisma.transactionItem.groupBy({
    by: ['productId'],
    where: {
      productId: { in: products.map(p => p.id) },
    },
    _sum: {
      quantity: true
    }
  });

  console.log('soldCounts:', JSON.stringify(soldCounts, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
