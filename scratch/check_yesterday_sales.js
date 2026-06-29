const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const start = new Date('2026-06-23T19:00:00.000Z');
  const end = new Date('2026-06-24T18:59:59.999Z');

  const salesByBranch = await prisma.transaction.groupBy({
    by: ['fromBranchId'],
    where: {
      type: 'SALE',
      status: { not: 'CANCELLED' },
      createdAt: { gte: start, lte: end }
    },
    _sum: {
      finalTotal: true
    },
    _count: {
      id: true
    }
  });

  console.log("Sales by Branch for 2026-06-24:");
  for (const b of salesByBranch) {
    const branch = await prisma.branch.findUnique({
      where: { id: b.fromBranchId }
    });
    console.log(`- Branch ID: ${b.fromBranchId} (${branch?.name || 'Unknown'}): Count = ${b._count.id}, Total Sales = ${b._sum.finalTotal.toLocaleString()} so'm`);
  }
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
