const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const txs = await prisma.transaction.findMany({
    where: {
      OR: [{ soldByUserId: 16 }, { userId: 16 }],
      status: { not: 'CANCELLED' },
      type: 'SALE',
      createdAt: { gte: new Date('2026-08-31T19:00:00.000Z'), lte: new Date('2026-09-12T18:59:59.999Z') }
    },
    include: {
      items: { include: { product: true } },
      bonuses: true,
      bonusProducts: true
    }
  });

  console.log('Ogabek (16) Transactions count:', txs.length);
  for (const t of txs) {
    console.log(`TX #${t.id}: Total=${t.finalTotal}, extraProfit=${t.extraProfit}, soldByUserId=${t.soldByUserId}, userId=${t.userId}, bonuses=${t.bonuses?.length}`);
    for (const item of t.items) {
      console.log(`   Item: ${item.product?.name}, qty=${item.quantity}, price=${item.price}, buyPrice=${item.buyPrice}`);
    }
  }
}
check().finally(() => prisma.$disconnect());
