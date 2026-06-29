const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Querying Transaction counts...');
    const counts = await prisma.transaction.groupBy({
      by: ['type', 'status'],
      _count: { id: true },
    });
    console.log('Transaction Counts:', JSON.stringify(counts, null, 2));

    const dateRange = await prisma.transaction.aggregate({
      _min: { createdAt: true },
      _max: { createdAt: true },
    });
    console.log('Transaction Date Range:', dateRange);

    const sample = await prisma.transaction.findMany({
      take: 5,
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
      }
    });
    console.log('Sample Transactions:', sample);

    // Check delivery tasks
    const taskCounts = await prisma.task.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    console.log('Task Counts:', taskCounts);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
