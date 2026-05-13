const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    take: 10,
    include: { category: true, branch: true }
  });

  const soldCounts = await prisma.transactionItem.groupBy({
    by: ['productId'],
    where: {
      productId: { in: products.map(p => p.id) },
      transaction: {
        type: { in: ['SALE', 'DELIVERY', 'TRANSFER'] },
        status: { not: 'CANCELLED' }
      }
    },
    _sum: {
      quantity: true
    }
  });

  const salesMap = soldCounts.reduce((acc, item) => {
    acc[item.productId] = (acc[item.productId] || 0) + (item._sum.quantity || 0);
    return acc;
  }, {});

  const result = products.map(p => ({
    id: p.id,
    name: p.name,
    trueSoldCount: salesMap[p.id] || 0
  }));

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
