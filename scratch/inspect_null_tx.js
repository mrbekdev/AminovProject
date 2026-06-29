const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const unmatched = await prisma.transaction.findMany({
    where: {
      type: 'SALE',
      status: { not: 'CANCELLED' },
      paymentType: null
    },
    include: {
      payments: true
    }
  });
  
  unmatched.forEach(u => {
    console.log(`ID: ${u.id}, finalTotal: ${u.finalTotal}, payments:`, u.payments);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
