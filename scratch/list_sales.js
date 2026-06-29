const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.transaction.findMany({
    where: {
      type: 'SALE',
      status: { not: 'CANCELLED' }
    },
    select: {
      id: true,
      finalTotal: true,
      createdAt: true,
      paymentType: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  console.log(`Total active sales: ${sales.length}`);
  sales.forEach(s => {
    console.log(`ID: ${s.id}, finalTotal: ${s.finalTotal}, paymentType: ${s.paymentType}, createdAt: ${s.createdAt.toISOString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
