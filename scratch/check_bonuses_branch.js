const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const bonuses = await prisma.bonus.findMany();
  console.log(`Total bonuses: ${bonuses.length}`);
  const withBranch = bonuses.filter(b => b.branchId !== null);
  const withoutBranch = bonuses.filter(b => b.branchId === null);
  console.log(`With branchId: ${withBranch.length}, Without branchId: ${withoutBranch.length}`);
}

check().finally(() => prisma.$disconnect());
