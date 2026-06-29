const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 7;
  const bonuses = await prisma.bonus.findMany({
    where: { userId }
  });

  console.log(`Found ${bonuses.length} bonuses:`);
  let sumSof = 0;
  let parsedCount = 0;

  for (const b of bonuses) {
    const desc = b.description || '';
    // Look for 'Sof ortiqcha: [number] som' or similar
    const match = desc.match(/Sof ortiqcha:\s*([\d,.-]+)\s*som/i);
    if (match) {
      const valStr = match[1].replace(/,/g, '');
      const val = parseFloat(valStr) || 0;
      sumSof += val;
      parsedCount++;
      console.log(`Bonus ID ${b.id}: amount=${b.amount}, reason=${b.reason}, desc="${desc}" => Parsed Sof ortiqcha = ${val}`);
    } else {
      console.log(`Bonus ID ${b.id}: amount=${b.amount}, reason=${b.reason}, desc="${desc}" => No match`);
    }
  }

  console.log(`\nTotal parsed: ${parsedCount}/${bonuses.length}`);
  console.log(`Sum of parsed Sof ortiqcha: ${sumSof}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
