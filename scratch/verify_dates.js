const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const minMax = await prisma.transaction.aggregate({
    _min: { createdAt: true },
    _max: { createdAt: true },
    _count: { id: true }
  });
  console.log('Transaction min/max/count:', minMax);

  const salesCount = await prisma.transaction.count({
    where: { type: 'SALE' }
  });
  console.log('Total SALE transactions:', salesCount);

  const recent = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('5 most recent transactions:', recent.map(r => ({ id: r.id, type: r.type, status: r.status, createdAt: r.createdAt })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
