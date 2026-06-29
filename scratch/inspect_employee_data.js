const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 7;

  // Direct bonuses (all time)
  const bonuses = await prisma.bonus.findMany({
    where: { userId: userId }
  });
  const sumDirect = bonuses.reduce((sum, b) => sum + (b.amount || 0), 0);
  console.log("All-time direct bonuses:", sumDirect);

  // Bonus products (all time)
  const bonusProducts = await prisma.transactionBonusProduct.findMany({
    where: {
      transaction: {
        soldByUserId: userId
      }
    },
    include: { product: true }
  });

  const sumProducts = bonusProducts.reduce((sum, bp) => {
    const price = bp.product?.price || 0;
    return sum + (price * bp.quantity);
  }, 0);
  console.log("All-time bonus products value:", sumProducts);
  console.log("All-time total KPI:", sumDirect + sumProducts);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
