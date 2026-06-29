const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const start = new Date('2000-01-01T00:00:00.000Z');
  const end = new Date();

  console.log('--- Inspecting Transactions by Type ---');
  
  const txGroup = await prisma.transaction.groupBy({
    by: ['type'],
    _count: { id: true },
    _sum: { total: true }
  });
  console.log('Transaction groups:', txGroup);

  const transactions = await prisma.transaction.findMany({
    where: {
      status: { not: 'CANCELLED' }
    },
    include: {
      items: true
    }
  });

  const summary = {};
  for (const tx of transactions) {
    const t = tx.type;
    if (!summary[t]) {
      summary[t] = { txCount: 0, totalQty: 0, largestTx: null };
    }
    const qty = tx.items.reduce((s, item) => s + (item.quantity || 0), 0);
    summary[t].txCount++;
    summary[t].totalQty += qty;

    if (!summary[t].largestTx || qty > summary[t].largestTx.qty) {
      summary[t].largestTx = {
        txId: tx.id,
        qty: qty,
        finalTotal: tx.finalTotal,
        createdAt: tx.createdAt
      };
    }
  }

  console.log('\nSummary by type (Non-cancelled):');
  console.dir(summary, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
