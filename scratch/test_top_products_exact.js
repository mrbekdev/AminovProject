const { PrismaClient, TransactionType, TransactionStatus, PaymentType } = require('@prisma/client');
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

  const activeRate = await prisma.currencyExchangeRate.findFirst({
    where: { fromCurrency: 'USD', toCurrency: 'UZS', isActive: true },
    orderBy: { updatedAt: 'desc' },
  });
  const currentExchangeRate = activeRate?.rate || 12600;

  const productSales = await prisma.transactionItem.groupBy({
    by: ['productId'],
    where: {
      transaction: {
        ...transactionWhere,
        type: TransactionType.SALE,
      },
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

  const productIds = productSales.map(ps => ps.productId).filter(id => id !== null);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      model: true,
      barcode: true,
      price: true,
      marketPrice: true,
    },
  });

  const productPaymentBreakdown = await Promise.all(
    productIds.map(async (productId) => {
      const breakdown = await prisma.transactionItem.groupBy({
        by: ['transactionId'],
        where: {
          productId,
          transaction: {
            ...transactionWhere,
            type: TransactionType.SALE,
          },
        },
        _sum: {
          quantity: true,
        },
      });

      const transactionIds = breakdown.map(b => b.transactionId);
      const transactions = transactionIds.length > 0
        ? await prisma.transaction.findMany({
            where: { id: { in: transactionIds } },
            include: { payments: true },
          })
        : [];

      let cashCount = 0;
      let cardCount = 0;
      let creditCount = 0;

      for (const b of breakdown) {
        const tx = transactions.find(t => t.id === b.transactionId);
        const qty = b._sum.quantity || 0;
        if (tx) {
          const payments = tx.payments || [];
          if (payments.length > 0) {
            const txTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) || 1;
            const cashAmt = payments.filter(p => String(p.method || '').toUpperCase() === 'CASH').reduce((s, p) => s + (Number(p.amount) || 0), 0);
            const cardAmt = payments.filter(p => ['CARD', 'TERMINAL', 'ICAN'].includes(String(p.method || '').toUpperCase())).reduce((s, p) => s + (Number(p.amount) || 0), 0);
            const creditAmt = Math.max(0, txTotal - cashAmt - cardAmt);

            if (cashAmt > 0 && cardAmt === 0 && creditAmt === 0) {
              cashCount += qty;
            } else if (cardAmt > 0 && cashAmt === 0 && creditAmt === 0) {
              cardCount += qty;
            } else if (creditAmt > 0 && cashAmt === 0 && cardAmt === 0) {
              creditCount += qty;
            } else {
              cashCount += (cashAmt / txTotal) * qty;
              cardCount += (cardAmt / txTotal) * qty;
              creditCount += (creditAmt / txTotal) * qty;
            }
          } else {
            const pType = String(tx.paymentType || '').toUpperCase();
            if (pType === 'CASH') {
              cashCount += qty;
            } else if (['CARD', 'TERMINAL', 'ICAN'].includes(pType)) {
              cardCount += qty;
            } else {
              creditCount += qty;
            }
          }
        }
      }

      return {
        productId,
        cashCount: Math.round(cashCount),
        cardCount: Math.round(cardCount),
        creditCount: Math.round(creditCount)
      };
    })
  );

  const topProducts = productSales.map(ps => {
    const prod = products.find(p => p.id === ps.productId);
    const payBreakdown = productPaymentBreakdown.find(pb => pb.productId === ps.productId);
    const priceInSom = prod?.marketPrice
      ? Math.round(prod.marketPrice * currentExchangeRate)
      : (ps._sum.total && ps._sum.quantity ? Math.round(ps._sum.total / ps._sum.quantity) : Math.round((prod?.price || 0) * currentExchangeRate));

    return {
      productId: ps.productId,
      name: prod?.name || 'Unknown',
      model: prod?.model || '',
      barcode: prod?.barcode || '',
      price: priceInSom,
      quantitySold: ps._sum.quantity || 0,
      totalRevenue: ps._sum.total || 0,
      cashCount: payBreakdown?.cashCount || 0,
      cardCount: payBreakdown?.cardCount || 0,
      creditCount: payBreakdown?.creditCount || 0,
    };
  });

  console.log('Top Products:');
  console.log(JSON.stringify(topProducts, null, 2));

  const totalCash = topProducts.reduce((s, p) => s + p.cashCount, 0);
  const totalCard = topProducts.reduce((s, p) => s + p.cardCount, 0);
  const totalCredit = topProducts.reduce((s, p) => s + p.creditCount, 0);
  console.log(`\nTotals: Cash=${totalCash}, Card=${totalCard}, Credit=${totalCredit}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
