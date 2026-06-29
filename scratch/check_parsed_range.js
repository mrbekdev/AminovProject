const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 7;
  
  // Tashkent timezone date boundaries for 2025-01-01 to 2026-01-01
  const start = new Date('2025-01-01');
  start.setUTCHours(start.getUTCHours() - 5);

  const end = new Date('2026-01-01');
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCHours(end.getUTCHours() - 5);
  end.setTime(end.getTime() - 1);

  const bonuses = await prisma.bonus.findMany({
    where: {
      userId,
      createdAt: {
        gte: start,
        lte: end
      }
    }
  });

  console.log(`Found ${bonuses.length} bonuses in range:`);
  let sumSof = 0;
  for (const b of bonuses) {
    const desc = b.description || '';
    const match = desc.match(/Sof ortiqcha:\s*([\d,.-]+)\s*som/i);
    if (match) {
      const valStr = match[1].replace(/,/g, '');
      const val = parseFloat(valStr) || 0;
      sumSof += val;
      console.log(`Bonus ID ${b.id}: amount=${b.amount}, desc="${desc}" => Parsed Sof ortiqcha = ${val}`);
    } else {
      console.log(`Bonus ID ${b.id}: amount=${b.amount}, desc="${desc}" => No match`);
    }
  }
  console.log(`\nSum of parsed Sof ortiqcha in range: ${sumSof}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
