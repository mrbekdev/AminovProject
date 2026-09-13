const { PrismaClient, TransactionType, TransactionStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const startDate = '2026-09-01';
  const endDate = '2026-09-12';

  let start = new Date(startDate);
  start.setUTCHours(start.getUTCHours() - 5);

  let end = new Date(endDate);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCHours(end.getUTCHours() - 5);
  end.setTime(end.getTime() - 1);

  const transactionWhere = {
    status: { not: TransactionStatus.CANCELLED },
    type: TransactionType.SALE,
    createdAt: { gte: start, lte: end }
  };

  const productSales = await prisma.transactionItem.groupBy({
    by: ['productId'],
    where: {
      transaction: transactionWhere,
      productId: { not: null },
    },
    _sum: {
      quantity: true,
      total: true,
    },
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: 10,
  });

  const productIds = productSales.map(ps => ps.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, model: true, barcode: true, price: true, marketPrice: true }
  });

  const exchangeRateRecord = await prisma.currencyExchangeRate.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  const exchangeRate = exchangeRateRecord?.rate || 12500;
  console.log('Using exchangeRate:', exchangeRate);

  for (const ps of productSales) {
    const prod = products.find(p => p.id === ps.productId);
    const txItems = await prisma.transactionItem.findMany({
      where: {
        productId: ps.productId,
        transaction: transactionWhere,
      },
      include: {
        transaction: {
          include: { payments: true }
        }
      }
    });

    let cashCount = 0;
    let cardCount = 0;
    let creditCount = 0;

    for (const item of txItems) {
      const tx = item.transaction;
      const qty = item.quantity || 1;
      const payments = tx.payments || [];

      if (payments.length > 0) {
        let hasCash = false;
        let hasCard = false;
        let hasCredit = false;

        for (const p of payments) {
          const m = String(p.method || '').toUpperCase();
          if (m === 'CASH') hasCash = true;
          else if (['CARD', 'TERMINAL', 'ICAN'].includes(m)) hasCard = true;
          else hasCredit = true; // THIRD_PARTY, CREDIT, INSTALLMENT, PARTNER, TOVAR, UYDAN
        }

        if (hasCash && !hasCard && !hasCredit) cashCount += qty;
        else if (!hasCash && hasCard && !hasCredit) cardCount += qty;
        else if (!hasCash && !hasCard && hasCredit) creditCount += qty;
        else {
          // Mixed payment: calculate proportional by amount
          const txTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) || 1;
          const cashAmt = payments.filter(p => String(p.method || '').toUpperCase() === 'CASH').reduce((s, p) => s + (Number(p.amount) || 0), 0);
          const cardAmt = payments.filter(p => ['CARD', 'TERMINAL', 'ICAN'].includes(String(p.method || '').toUpperCase())).reduce((s, p) => s + (Number(p.amount) || 0), 0);
          const creditAmt = txTotal - cashAmt - cardAmt;

          cashCount += Math.round((cashAmt / txTotal) * qty * 10) / 10;
          cardCount += Math.round((cardAmt / txTotal) * qty * 10) / 10;
          creditCount += Math.round((creditAmt / txTotal) * qty * 10) / 10;
        }
      } else {
        const pType = String(tx.paymentType || '').toUpperCase();
        if (pType === 'CASH') cashCount += qty;
        else if (['CARD', 'TERMINAL', 'ICAN'].includes(pType)) cardCount += qty;
        else creditCount += qty;
      }
    }

    const priceInSom = prod?.marketPrice 
      ? Math.round(prod.marketPrice * exchangeRate)
      : (ps._sum.total && ps._sum.quantity ? Math.round(ps._sum.total / ps._sum.quantity) : Math.round((prod?.price || 0) * exchangeRate));

    console.log(`\nProduct: ${prod?.name} (${prod?.model}), barcode=${prod?.barcode}`);
    console.log(`  Raw DB price (USD): $${prod?.price}, marketPrice (USD): $${prod?.marketPrice}`);
    console.log(`  Calculated price (SO'M): ${priceInSom.toLocaleString()} so'm`);
    console.log(`  Quantity Sold: ${ps._sum.quantity} ta`);
    console.log(`  Total Revenue: ${ps._sum.total.toLocaleString()} so'm`);
    console.log(`  Payments: Cash=${cashCount}, Card=${cardCount}, Credit=${creditCount}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
