const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runStatsTest(startDate, endDate) {
  // Translate start/end timezone-aware dates (UTC+5 Tashkent)
  let start = new Date(startDate);
  start.setUTCHours(start.getUTCHours() - 5);

  let end = new Date(endDate);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCHours(end.getUTCHours() - 5);
  end.setTime(end.getTime() - 1);

  console.log(`\nRange: ${startDate} to ${endDate}`);
  console.log(`UTC start: ${start.toISOString()} | UTC end: ${end.toISOString()}`);

  // 1. Group by soldByUserId on SALE transactions (non-cancelled) to get candidate top employees
  const employeeSales = await prisma.transaction.groupBy({
    by: ['soldByUserId'],
    where: {
      status: { not: 'CANCELLED' },
      type: 'SALE',
      soldByUserId: { not: null },
      createdAt: { gte: start, lte: end }
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

  const employeeIds = employeeSales.map(es => es.soldByUserId).filter(id => id !== null);
  console.log(`Top Employee IDs:`, employeeIds);

  const users = await prisma.user.findMany({
    where: { id: { in: employeeIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
    },
  });

  // 2. Fetch all transactions for top employees within date range (soldByUserId OR userId)
  const employeeTransactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { soldByUserId: { in: employeeIds } },
        { userId: { in: employeeIds } },
      ],
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    select: {
      id: true,
      soldByUserId: true,
      userId: true,
      finalTotal: true,
      extraProfit: true,
    },
  });

  // 3. Fetch bonuses for top employees within date range
  const employeeBonuses = await prisma.bonus.findMany({
    where: {
      userId: { in: employeeIds },
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    select: {
      userId: true,
      amount: true,
    },
  });

  const topEmployees = employeeSales.map(es => {
    const uId = es.soldByUserId;
    const user = users.find(u => u.id === uId);
    const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown';
    
    const userTxs = employeeTransactions.filter(tx => tx.soldByUserId === uId || tx.userId === uId);
    const totalSales = userTxs.reduce((sum, tx) => sum + (tx.finalTotal || 0), 0);
    const totalProfit = userTxs.reduce((sum, tx) => sum + (Number(tx.extraProfit) || 0), 0);
    const salesCount = userTxs.length;

    const userBonuses = employeeBonuses.filter(b => b.userId === uId);
    const totalBonuses = userBonuses.reduce((sum, b) => sum + (b.amount || 0), 0);

    return {
      userId: uId,
      username: user?.username,
      fullName: name,
      salesVolume: totalSales,
      salesCount: salesCount,
      kpi: totalBonuses,
      netProfit: totalProfit,
    };
  });

  topEmployees.sort((a, b) => b.salesVolume - a.salesVolume);

  for (const emp of topEmployees) {
    console.log(`User ${emp.userId} (${emp.username}): salesVolume=${emp.salesVolume}, salesCount=${emp.salesCount}, kpi=${emp.kpi}, netProfit=${emp.netProfit}`);
  }
}

async function main() {
  await runStatsTest('2025-01-01', '2026-01-01');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
