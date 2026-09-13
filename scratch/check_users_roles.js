const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, status: true, firstName: true, lastName: true }
  });
  console.log('All Users:');
  for (const u of users) {
    const txCount = await prisma.transaction.count({
      where: { OR: [{ soldByUserId: u.id }, { userId: u.id }], type: 'SALE' }
    });
    const bonusCount = await prisma.bonus.count({
      where: { userId: u.id }
    });
    if (u.role === 'MARKETING' || txCount > 0 || bonusCount > 0) {
      console.log(`User ${u.id}: @${u.username} (${u.firstName} ${u.lastName}), Role: ${u.role}, Status: ${u.status}, Total Txs: ${txCount}, Bonuses: ${bonusCount}`);
    }
  }
}

check().finally(() => prisma.$disconnect());
