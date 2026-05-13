const { PrismaClient, TransactionType } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Available TransactionTypes:', TransactionType);
  
  const stats = await prisma.transactionItem.groupBy({
    by: ['transactionId'],
    where: { productId: 17 },
    _sum: { quantity: true }
  });

  const txIds = stats.map(s => s.transactionId);
  const transactions = await prisma.transaction.findMany({
    where: { id: { in: txIds } },
    select: { id: true, type: true, status: true }
  });

  console.log('Product 17 Transactions:', transactions);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
