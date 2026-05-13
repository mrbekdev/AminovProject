const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const productId = 17;
  const stats = await prisma.transactionItem.groupBy({
    by: ['transactionId'],
    where: { productId: productId },
    _sum: { quantity: true }
  });

  const txIds = stats.map(s => s.transactionId);
  const transactions = await prisma.transaction.findMany({
    where: { id: { in: txIds } },
    select: { id: true, type: true, status: true }
  });

  const results = stats.map(s => {
    const tx = transactions.find(t => t.id === s.transactionId);
    return {
      type: tx.type,
      status: tx.status,
      quantity: s._sum.quantity
    };
  });

  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
