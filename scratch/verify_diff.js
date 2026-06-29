const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // We use dates covering the entire range of the DB
  const start = new Date('2025-01-01T00:00:00.000Z');
  const end = new Date('2026-12-31T23:59:59.999Z');
  
  const transactions = await prisma.transaction.findMany({
    where: {
      type: 'SALE',
      status: { not: 'CANCELLED' },
      createdAt: {
        gte: start,
        lte: end
      }
    },
    include: {
      payments: true
    }
  });
  
  console.log(`\nAll range count: ${transactions.length}`);
  let totalSum = 0;
  transactions.forEach(t => {
    totalSum += t.finalTotal;
  });
  console.log(`Total sum of finalTotal: ${totalSum}`);
  
  // Let's analyze how backend groups by paymentType
  const salesByPaymentType = await prisma.transaction.groupBy({
    by: ['paymentType'],
    where: {
      type: 'SALE',
      status: { not: 'CANCELLED' },
      createdAt: {
        gte: start,
        lte: end
      }
    },
    _sum: {
      finalTotal: true,
    },
  });
  
  console.log('\nBackend Group By paymentType results:');
  let groupSum = 0;
  salesByPaymentType.forEach(s => {
    console.log(` - ${s.paymentType}: ${s._sum.finalTotal}`);
    groupSum += s._sum.finalTotal || 0;
  });
  console.log(`Sum of grouped payment types: ${groupSum}`);
  
  // Let's find if any transactions have paymentType as null or not matched:
  const unmatched = transactions.filter(t => !t.paymentType);
  console.log(`\nTransactions with null/falsy paymentType in DB: ${unmatched.length}`);
  if (unmatched.length > 0) {
    let sumUnmatched = 0;
    unmatched.forEach(u => {
      sumUnmatched += u.finalTotal;
      console.log(` - ID: ${u.id}, finalTotal: ${u.finalTotal}, paymentType: ${u.paymentType}, status: ${u.status}, createdAt: ${u.createdAt}`);
    });
    console.log(`Total sum of unmatched: ${sumUnmatched}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
