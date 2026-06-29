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
  let sumSales = 0;
  let sumSof = 0;
  for (const b of bonuses) {
    const desc = b.description || '';
    const matchSales = desc.match(/Sotish narxi:\s*([\d,.-]+)/i);
    const matchSof = desc.match(/Sof ortiqcha:\s*([\d,.-]+)/i);
    
    let saleVal = 0;
    let sofVal = 0;
    
    if (matchSales) {
      const valStr = matchSales[1].replace(/,/g, '');
      saleVal = parseFloat(valStr) || 0;
      sumSales += saleVal;
    }
    if (matchSof) {
      const valStr = matchSof[1].replace(/,/g, '');
      sofVal = parseFloat(valStr) || 0;
      sumSof += sofVal;
    }
    console.log(`Bonus ID ${b.id}: amount=${b.amount}, desc="${desc}" => Parsed Sales=${saleVal}, Sof=${sofVal}`);
  }
  console.log(`\nSum of parsed Sotish narxi in range: ${sumSales}`);
  console.log(`Sum of parsed Sof ortiqcha in range: ${sumSof}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
