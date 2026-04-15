const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFetchAndTargetProduct() {
  // Try to find the latest transfer
  const latestTransfer = await prisma.transaction.findFirst({
    where: { type: 'TRANSFER' },
    orderBy: { createdAt: 'desc' },
    include: { items: true, toBranch: true, fromBranch: true }
  });

  if (latestTransfer) {
    console.log('Latest Transfer:', { id: latestTransfer.id, from: latestTransfer.fromBranchId, to: latestTransfer.toBranchId });
    for (const item of latestTransfer.items) {
      console.log('Transfer Item:', item);
    }
  } else {
    console.log('No transfer found.');
  }

  // Check the products from branch 2
  const targetProducts = await prisma.product.findMany({
    where: { branchId: latestTransfer?.toBranchId || 2 },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('Recent Target Products:');
  for (const t of targetProducts) {
    console.log(`- ID: ${t.id}, Barcode: ${t.barcode}, Qty: ${t.quantity}, branch: ${t.branchId}`);
  }
}

testFetchAndTargetProduct()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
