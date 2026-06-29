const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simulate getDashboardStats logic for a specific date range
async function testDateRange(label, startDate, endDate) {
  let start, end;

  if (startDate) {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date('2000-01-01T00:00:00.000Z');
  }
  if (endDate) {
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  } else {
    end = new Date();
  }

  console.log(`\n=== ${label} ===`);
  console.log(`Start: ${start.toISOString()}`);
  console.log(`End: ${end.toISOString()}`);

  const transactionWhere = {
    status: { not: 'CANCELLED' },
    createdAt: { gte: start, lte: end }
  };

  const employeeSales = await prisma.transaction.groupBy({
    by: ['soldByUserId'],
    where: {
      ...transactionWhere,
      type: 'SALE',
      soldByUserId: { not: null },
    },
    _sum: {
      finalTotal: true,
      extraProfit: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        finalTotal: 'desc',
      },
    },
    take: 10,
  });

  console.log(`Employee Sales Results: ${employeeSales.length} employees`);
  for (const es of employeeSales) {
    const user = await prisma.user.findUnique({
      where: { id: es.soldByUserId },
      select: { firstName: true, lastName: true, username: true }
    });

    // Bonuses in range
    const bonuses = await prisma.bonus.findMany({
      where: {
        userId: es.soldByUserId,
        createdAt: { gte: start, lte: end }
      },
      select: { amount: true }
    });
    const kpiBonuses = bonuses.reduce((sum, b) => sum + (b.amount || 0), 0);

    // Bonus products in range
    const bonusProducts = await prisma.transactionBonusProduct.findMany({
      where: {
        transaction: {
          ...transactionWhere,
          soldByUserId: es.soldByUserId,
        }
      },
      include: { product: { select: { price: true } } }
    });
    const kpiBonusProds = bonusProducts.reduce((sum, bp) => sum + ((bp.product?.price || 0) * bp.quantity), 0);

    console.log(`  User ${es.soldByUserId} (${user?.username || '?'}): salesVolume=${es._sum.finalTotal}, salesCount=${es._count.id}, netProfit=${es._sum.extraProfit}, kpi=${kpiBonuses + kpiBonusProds}`);
  }
}

async function main() {
  // Test 1: All time (no dates)
  await testDateRange("All Time (no dates)", null, null);

  // Test 2: Last 30 days (Statistika default from June 17)
  const d30 = new Date('2026-06-17');
  d30.setDate(d30.getDate() - 30);
  await testDateRange("Last 30 Days (2026-05-18 to 2026-06-17)", '2026-05-18', '2026-06-17');

  // Test 3: 2025-01-01 to 2026-01-01 (User's filter in screenshot)
  await testDateRange("2025-01-01 to 2026-01-01 (User's filter)", '2025-01-01', '2026-01-01');

  // Test 4: 2025-09-19 to 2025-11-28 (matches UserDetails bonuses)
  await testDateRange("2025-09-19 to 2025-11-28", '2025-09-19', '2025-11-28');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
