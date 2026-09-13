const { PrismaClient, TransactionType, TransactionStatus, UserRole, UserStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUserReportSim(userId, startDate, endDate, branchId) {
  const dateWhere = {};
  if (startDate || endDate) {
    dateWhere.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      const isUTC = startDate.endsWith('Z') || startDate.includes('+');
      if (!isUTC) start.setUTCHours(start.getUTCHours() - 5);
      dateWhere.createdAt.gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      const isUTC = endDate.endsWith('Z') || endDate.includes('+');
      if (!isUTC) {
        end.setUTCDate(end.getUTCDate() + 1);
        end.setUTCHours(end.getUTCHours() - 5);
        end.setTime(end.getTime() - 1);
      }
      dateWhere.createdAt.lte = end;
    }
  }

  const bonuses = await prisma.bonus.findMany({
    where: {
      userId,
      ...dateWhere,
    }
  });

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { soldByUserId: userId },
        { userId: userId }
      ],
      type: TransactionType.SALE,
      status: { not: TransactionStatus.CANCELLED },
      ...dateWhere,
    }
  });

  const txSalesTotal = transactions.reduce((sum, tx) => sum + (Number(tx.finalTotal ?? tx.total ?? 0)), 0);

  let totalProfit = 0;
  for (const b of bonuses) {
    if (b.description) {
      const matchProfit = b.description.match(/Sof ortiqcha:\s*([\d,.-]+)/i);
      if (matchProfit) {
        const valStr = matchProfit[1].replace(/,/g, '');
        totalProfit += parseFloat(valStr) || 0;
      }
    }
  }

  const totalBonuses = bonuses.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  return {
    salesCount: transactions.length,
    totalSales: txSalesTotal,
    totalBonuses,
    totalProfit,
    bonusesCount: bonuses.length
  };
}

async function getStatsSim(startDate, endDate, branchId) {
  let start, end;
  if (startDate) {
    start = new Date(startDate);
    const isUTC = startDate.endsWith('Z') || startDate.includes('+');
    if (!isUTC) start.setUTCHours(start.getUTCHours() - 5);
  } else {
    start = new Date('2000-01-01T00:00:00.000Z');
  }
  if (endDate) {
    end = new Date(endDate);
    const isUTC = endDate.endsWith('Z') || endDate.includes('+');
    if (!isUTC) {
      end.setUTCDate(end.getUTCDate() + 1);
      end.setUTCHours(end.getUTCHours() - 5);
      end.setTime(end.getTime() - 1);
    }
  } else {
    end = new Date();
  }

  const marketingSellers = await prisma.user.findMany({
    where: {
      role: UserRole.MARKETING,
      status: { not: UserStatus.DELETED },
      ...(branchId ? { branchId } : {}),
    },
    select: { id: true, firstName: true, lastName: true, username: true },
    orderBy: { id: 'asc' },
  });

  const sellerIds = marketingSellers.map(s => s.id);

  const sellerTransactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { soldByUserId: { in: sellerIds } },
        { userId: { in: sellerIds } },
      ],
      status: { not: TransactionStatus.CANCELLED },
      type: TransactionType.SALE,
      createdAt: { gte: start, lte: end },
      ...(branchId ? {
        AND: [{ OR: [{ fromBranchId: branchId }, { toBranchId: branchId }] }]
      } : {}),
    },
    select: {
      id: true,
      soldByUserId: true,
      userId: true,
      finalTotal: true,
      total: true,
      extraProfit: true,
    }
  });

  const sellerBonuses = await prisma.bonus.findMany({
    where: {
      userId: { in: sellerIds },
      createdAt: { gte: start, lte: end },
      ...(branchId ? { branchId } : {}),
    },
    select: {
      userId: true,
      amount: true,
      description: true,
    }
  });

  const topEmployees = marketingSellers.map(seller => {
    const uId = seller.id;
    const name = `${seller.firstName || ''} ${seller.lastName || ''}`.trim() || seller.username;
    const userTxs = sellerTransactions.filter(tx => tx.soldByUserId === uId || (!tx.soldByUserId && tx.userId === uId));
    const salesCount = userTxs.length;
    const totalSales = userTxs.reduce((sum, tx) => sum + Number(tx.finalTotal ?? tx.total ?? 0), 0);
    const userBonuses = sellerBonuses.filter(b => b.userId === uId);
    const totalBonuses = userBonuses.reduce((sum, b) => sum + (b.amount || 0), 0);

    let totalProfit = 0;
    for (const b of userBonuses) {
      if (b.description) {
        const matchProfit = b.description.match(/Sof ortiqcha:\s*([\d,.-]+)/i);
        if (matchProfit) {
          const valStr = matchProfit[1].replace(/,/g, '');
          totalProfit += parseFloat(valStr) || 0;
        }
      }
    }
    if (totalProfit === 0 && userTxs.length > 0) {
      totalProfit = userTxs.reduce((sum, tx) => sum + Number(tx.extraProfit || 0), 0);
    }

    return {
      userId: uId,
      fullName: name,
      salesVolume: totalSales,
      salesCount: salesCount,
      kpi: totalBonuses,
      netProfit: totalProfit,
    };
  });

  return topEmployees;
}

async function runComparison() {
  const testRanges = [
    { start: '2026-09-01', end: '2026-09-12' },
    { start: '2026-01-01', end: '2026-12-31' },
    { start: '2025-01-01', end: '2026-12-31' },
    { start: '', end: '' },
  ];

  for (const { start, end } of testRanges) {
    console.log(`\n========================================`);
    console.log(`Testing range: "${start}" -> "${end}"`);
    console.log(`========================================`);
    const stats = await getStatsSim(start, end);

    let mismatches = 0;
    for (const emp of stats) {
      const userReport = await getUserReportSim(emp.userId, start, end);
      const salesMatch = emp.salesVolume === userReport.totalSales;
      const countMatch = emp.salesCount === userReport.salesCount;
      const kpiMatch = emp.kpi === userReport.totalBonuses;
      const profitMatch = emp.netProfit === userReport.totalProfit;

      if (!salesMatch || !countMatch || !kpiMatch || !profitMatch) {
        mismatches++;
        console.log(`❌ MISMATCH for ${emp.fullName} (ID ${emp.userId}):`);
        console.log(`   Statistika : Sales=${emp.salesVolume}, Count=${emp.salesCount}, KPI=${emp.kpi}, Profit=${emp.netProfit}`);
        console.log(`   UserDetails: Sales=${userReport.totalSales}, Count=${userReport.salesCount}, KPI=${userReport.totalBonuses}, Profit=${userReport.totalProfit}`);
      }
    }
    if (mismatches === 0) {
      console.log(`✅ All ${stats.length} sellers matched 100%!`);
    } else {
      console.log(`❌ ${mismatches} mismatches found!`);
    }
  }
}

runComparison().finally(() => prisma.$disconnect());
