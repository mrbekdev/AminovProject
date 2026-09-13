const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rates = await prisma.currencyExchangeRate.findMany();
  console.log('Exchange rates:', rates);

  const topItems = await prisma.transactionItem.findMany({
    where: {
      transaction: {
        createdAt: { gte: new Date('2026-08-31T19:00:00.000Z'), lte: new Date('2026-09-12T18:59:59.999Z') },
        type: 'SALE',
        status: { not: 'CANCELLED' }
      }
    },
    include: { product: true, transaction: { include: { payments: true } } }
  });

  console.log(`\nTransaction items in date range: ${topItems.length}`);
  for (const item of topItems) {
    console.log(`TX #${item.transactionId}: Product="${item.product?.name}" (${item.product?.model}) barcode=${item.product?.barcode}, item.qty=${item.quantity}, item.price(som)=${item.price}, item.total(som)=${item.total}, prod.price(usd)=${item.product?.price}, prod.marketPrice=${item.product?.marketPrice}, paymentType=${item.transaction?.paymentType}, payments=`, item.transaction?.payments);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
