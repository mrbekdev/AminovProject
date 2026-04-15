const { PrismaClient } = require('@prisma/client');
const { TransactionService } = require('./src/transaction/transaction.service');

// Simple mock for CurrencyExchangeRateService and other services
const mockCurrencyService = {};
const mockBonusService = {
  calculateAndCreateSalesBonuses: async () => {} 
};
const mockTaskService = {
  create: async () => {}
};

async function run() {
  const prisma = new PrismaClient();
  const txService = new TransactionService(prisma, mockCurrencyService, mockBonusService, mockTaskService);

  // Transfer 1 item from branch 1 to branch 2
  // We'll pick any product from branch 1
  const sourceProduct = await prisma.product.findFirst({
    where: { branchId: 1, quantity: { gt: 0 } }
  });

  if (!sourceProduct) {
    console.log("No source products available");
    return;
  }

  console.log("Source product before:", sourceProduct);

  const transferData = {
    type: 'TRANSFER',
    fromBranchId: 1,
    toBranchId: 2,
    userId: 1,
    soldByUserId: 1,
    items: [
      {
        productId: sourceProduct.id,
        quantity: 1,
        price: sourceProduct.price || 0,
        name: sourceProduct.name
      }
    ]
  };

  const res = await txService.createTransfer(transferData);
  console.log("Transfer Result Items:", res.data.items);
  
  // Find the target product now!
  const targetProduct = await prisma.product.findFirst({
    where: { 
      branchId: 2,
      // Same barcode or name to see if it created or updated
      name: sourceProduct.name
    },
    orderBy: { updatedAt: 'desc' }
  });
  console.log("Target product after transfer:", targetProduct);
  
  await prisma.$disconnect();
}

run().catch(console.error);
