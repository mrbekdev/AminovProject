const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bonuses = await prisma.bonus.findMany({
    where: { userId: 7, reason: 'SALES_BONUS' }
  });
  console.log(`User 7 has ${bonuses.length} bonuses`);
  if (bonuses.length > 0) {
    console.log('Min createdAt:', bonuses[0].createdAt);
    console.log('Max createdAt:', bonuses[bonuses.length - 1].createdAt);
    const start = new Date('2025-01-16T00:00:00');
    const end = new Date('2026-06-16T23:59:59');
    const inRange = bonuses.filter(b => b.createdAt >= start && b.createdAt <= end);
    console.log(`Number of bonuses in range [2025-01-16, 2026-06-16]: ${inRange.length}`);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
