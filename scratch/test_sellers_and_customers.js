const { PrismaClient, TransactionType, TransactionStatus, UserRole, UserStatus } = require('@prisma/client');
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

  console.log('Date range in UTC:', start.toISOString(), 'to', end.toISOString());

  // 1. Get all marketing sellers
  const marketingSellers = await prisma.user.findMany({
    where: {
      role: UserRole.MARKETING,
      status: { not: UserStatus.DELETED },
    },
    select: { id: true, firstName: true, lastName: true, username: true, phone: true }
  });

  console.log('Marketing sellers count:', marketingSellers.length);

  for (const seller of marketingSellers) {
    const uId = seller.id;
    // Check transactions
    const txs = await prisma.transaction.findMany({
      where: {
        OR: [
          { soldByUserId: uId },
          { userId: uId }
        ],
        status: { not: TransactionStatus.CANCELLED },
        type: TransactionType.SALE,
        createdAt: { gte: start, lte: end }
      },
      include: {
        items: true,
        bonusProducts: { include: { product: true } }
      }
    });

    const bonuses = await prisma.bonus.findMany({
      where: {
        userId: uId,
        createdAt: { gte: start, lte: end }
      }
    });

    const txSalesTotal = txs.reduce((sum, tx) => sum + (Number(tx.finalTotal ?? tx.total ?? 0)), 0);
    const totalBonuses = bonuses.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    
    let totalProfitFromBonuses = 0;
    for (const b of bonuses) {
      if (b.description) {
        const matchProfit = b.description.match(/Sof ortiqcha:\s*([\d,.-]+)/i);
        if (matchProfit) {
          const valStr = matchProfit[1].replace(/,/g, '');
          totalProfitFromBonuses += parseFloat(valStr) || 0;
        }
      }
    }

    const extraProfitFromTxs = txs.reduce((sum, tx) => sum + (Number(tx.extraProfit) || 0), 0);

    if (txs.length > 0 || bonuses.length > 0) {
      console.log(`\nSeller: ${seller.firstName} ${seller.lastName} (@${seller.username}) [ID: ${uId}]`);
      console.log(`  Txs count: ${txs.length}, Sales Total: ${txSalesTotal.toLocaleString()}`);
      console.log(`  Bonuses count: ${bonuses.length}, Bonuses sum (amount): ${totalBonuses.toLocaleString()}`);
      console.log(`  totalProfitFromBonuses: ${totalProfitFromBonuses.toLocaleString()}`);
      console.log(`  extraProfitFromTxs: ${extraProfitFromTxs.toLocaleString()}`);
      console.log(`  Bonuses details:`, bonuses.map(b => ({ id: b.id, amount: b.amount, reason: b.reason, desc: b.description })));
    }
  }

  // Also check top customers
  console.log('\n--- TOP CUSTOMERS ---');
  const customerTxs = await prisma.transaction.findMany({
    where: {
      type: TransactionType.SALE,
      status: { not: TransactionStatus.CANCELLED },
      createdAt: { gte: start, lte: end },
      customerId: { not: null }
    },
    include: { customer: true, items: { include: { product: true } } }
  });

  const custMap = {};
  for (const tx of customerTxs) {
    const cId = tx.customerId;
    if (!custMap[cId]) {
      custMap[cId] = {
        id: cId,
        name: tx.customer ? tx.customer.fullName : 'Noma\'lum',
        phone: tx.customer ? tx.customer.phone : '',
        count: 0,
        spent: 0,
        extraProfit: 0,
        txs: []
      };
    }
    custMap[cId].count++;
    custMap[cId].spent += Number(tx.finalTotal || tx.total || 0);
    custMap[cId].extraProfit += Number(tx.extraProfit || 0);
    custMap[cId].txs.push({
      id: tx.id,
      finalTotal: tx.finalTotal,
      extraProfit: tx.extraProfit,
      items: tx.items.map(i => ({ name: i.product?.name, qty: i.quantity, price: i.price, buyPrice: i.buyPrice, itemProfit: (i.price - (i.buyPrice || 0)) * i.quantity }))
    });
  }

  const sortedCusts = Object.values(custMap).sort((a,b) => b.spent - a.spent);
  for (const c of sortedCusts.slice(0, 5)) {
    console.log(`Customer: ${c.name} (${c.phone}), Orders: ${c.count}, Spent: ${c.spent.toLocaleString()}, extraProfit on tx: ${c.extraProfit.toLocaleString()}`);
    for (const t of c.txs) {
      console.log(`  TX #${t.id}: finalTotal=${t.finalTotal}, extraProfit=${t.extraProfit}, items=`, t.items);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
