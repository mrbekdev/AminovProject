const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'MARKETING' },
    select: { id: true, username: true }
  });
  const marketingUserIds = users.map(u => u.id);
  console.log('Marketing User IDs:', marketingUserIds);

  const bonuses = await prisma.bonus.findMany({
    where: {
      userId: { in: marketingUserIds },
      reason: 'SALES_BONUS'
    }
  });
  console.log(`Found ${bonuses.length} marketing sales bonuses:`);
  let marketingTotalSofOrtiqcha = 0;
  for (const b of bonuses) {
    const match = b.description?.match(/Sof ortiqcha:\s*([\d,]+)/);
    const sof = match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
    marketingTotalSofOrtiqcha += sof;
    console.log(`Bonus ID ${b.id}: amount=${b.amount}, reason=${b.reason}, description="${b.description}", parsed Sof ortiqcha=${sof}`);
  }
  console.log('Total parsed Sof ortiqcha from bonuses:', marketingTotalSofOrtiqcha);

  const allBonuses = await prisma.bonus.findMany({});
  console.log(`Total bonuses in database: ${allBonuses.length}`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
