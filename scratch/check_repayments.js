const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const start = new Date('2026-06-22T19:00:00.000Z');
  const end = new Date('2026-06-23T18:59:59.999Z');

  console.log("=== Checking daily repayments ===");
  const daily = await prisma.dailyRepayment.findMany({
    where: { paidAt: { gte: start, lte: end } },
    include: {
      transaction: {
        include: { customer: true }
      }
    }
  });

  daily.forEach(dr => {
    console.log(`DailyRepayment ID: ${dr.id} | TxID: ${dr.transactionId} | CustID: ${dr.transaction?.customerId} | CustomerName: ${dr.transaction?.customer?.fullName || 'NULL'} | CustNameField: ${dr.transaction?.customerName || 'NULL'}`);
  });

  console.log("\n=== Checking credit repayments ===");
  const credit = await prisma.creditRepayment.findMany({
    where: { paidAt: { gte: start, lte: end } },
    include: {
      transaction: {
        include: { customer: true }
      }
    }
  });

  credit.forEach(cr => {
    console.log(`CreditRepayment ID: ${cr.id} | TxID: ${cr.transactionId} | CustID: ${cr.transaction?.customerId} | CustomerName: ${cr.transaction?.customer?.fullName || 'NULL'}`);
  });
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
