const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const start = new Date('2025-01-01T00:00:00.000Z');
  const end = new Date('2026-12-31T23:59:59.999Z');

  const activeSales = await prisma.transaction.findMany({
    where: {
      type: 'SALE',
      status: { not: 'CANCELLED' },
      createdAt: { gte: start, lte: end }
    },
    include: {
      payments: true,
    },
  });

  let cashSales = 0;
  let cardSales = 0;
  let terminalSales = 0;
  let creditSales = 0;
  let installmentSales = 0;
  let uydanSales = 0;
  let thirdPartySales = 0;
  let tovarSales = 0;
  let totalSales = 0;

  const normalizePaymentType = (raw) => {
    const t = String(raw || '').toUpperCase().trim();
    if (!t) return null;
    if (['CASH', 'NAQD', 'NAL'].includes(t)) return 'CASH';
    if (['CARD', 'ICAN', 'PLASTIC', 'PLASTIK'].includes(t)) return 'CARD';
    if (['TERMINAL', 'POS', 'TRANSFER', 'BANK', 'CLICK', 'PAYME'].includes(t)) return 'TERMINAL';
    if (['CREDIT', 'DEBT'].includes(t)) return 'CREDIT';
    if (['INSTALLMENT', 'BOLOB', "BO'LIB"].includes(t)) return 'INSTALLMENT';
    if (['UYDAN', 'HOME'].includes(t)) return 'UYDAN';
    if (['THIRD_PARTY'].includes(t)) return 'THIRD_PARTY';
    if (['TOVAR'].includes(t)) return 'TOVAR';
    return t;
  };

  activeSales.forEach(t => {
    const finalTotal = t.finalTotal || t.total || 0;
    totalSales += finalTotal;

    const hasSplitPayments = Array.isArray(t.payments) && t.payments.length > 0;

    if (hasSplitPayments) {
      const seenPaymentSignatures = new Set();
      t.payments.forEach(p => {
        const m = String(p.method || '').toUpperCase();
        const amt = Number(p.amount || 0);
        const sig = `${m}:${amt}:${p.id}`;
        if (seenPaymentSignatures.has(sig)) return;
        seenPaymentSignatures.add(sig);

        if (m === 'CASH') cashSales += amt;
        else if (m === 'CARD') cardSales += amt;
        else if (m === 'TERMINAL') terminalSales += amt;
        else if (m === 'UYDAN') uydanSales += amt;
        else if (m === 'CREDIT') creditSales += amt;
        else if (m === 'INSTALLMENT') installmentSales += amt;
        else if (m === 'THIRD_PARTY') thirdPartySales += amt;
        else if (m === 'TOVAR') tovarSales += amt;
      });
    } else {
      const mainType = normalizePaymentType(t.paymentType);
      
      const isDebtType = ['CREDIT', 'INSTALLMENT', 'UYDAN'].includes(mainType || '');
      if (isDebtType) {
        const paidAmount = Number(t.downPayment || t.amountPaid || 0);
        const remainingAmount = Math.max(0, finalTotal - paidAmount);

        if (mainType === 'CREDIT') creditSales += remainingAmount;
        else if (mainType === 'INSTALLMENT') installmentSales += remainingAmount;
        else if (mainType === 'UYDAN') uydanSales += remainingAmount;

        const upfront = String(t.upfrontPaymentType || 'CASH').toUpperCase();
        if (upfront === 'CASH') cashSales += paidAmount;
        else if (upfront === 'CARD') cardSales += paidAmount;
        else if (upfront === 'TERMINAL') terminalSales += paidAmount;
        else if (upfront === 'THIRD_PARTY') thirdPartySales += paidAmount;
        else cashSales += paidAmount;
      } else {
        if (mainType === 'CASH') cashSales += finalTotal;
        else if (mainType === 'CARD') cardSales += finalTotal;
        else if (mainType === 'TERMINAL') terminalSales += finalTotal;
        else if (mainType === 'THIRD_PARTY') thirdPartySales += finalTotal;
        else if (mainType === 'TOVAR') tovarSales += finalTotal;
        else cashSales += finalTotal;
      }
    }
  });

  console.log('--- Aggregated Sales Summary ---');
  console.log('Cash:', cashSales);
  console.log('Card:', cardSales);
  console.log('Terminal:', terminalSales);
  console.log('Credit:', creditSales);
  console.log('Installment:', installmentSales);
  console.log('Uydan:', uydanSales);
  console.log('Third Party:', thirdPartySales);
  console.log('Tovar:', tovarSales);
  console.log('Total Sales (Sum of categories):', cashSales + cardSales + terminalSales + creditSales + installmentSales + uydanSales + thirdPartySales + tovarSales);
  console.log('Total Sales (Raw sum):', totalSales);
}

main().catch(console.error).finally(() => prisma.$disconnect());
