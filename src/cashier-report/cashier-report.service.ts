import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCashierReportDto } from './dto/create-cashier-report.dto';
import { UpdateCashierReportDto } from './dto/update-cashier-report.dto';

@Injectable()
export class CashierReportService {
  constructor(private prisma: PrismaService) { }

  async create(createCashierReportDto: CreateCashierReportDto) {
    return this.prisma.cashierReport.create({
      data: createCashierReportDto,
      include: {
        cashier: true,
        branch: true,
      },
    });
  }

  async findAll(query: any = {}) {
    const { cashierId, branchId, startDate, endDate, limit = 100 } = query;

    const where: any = {};

    if (cashierId) {
      where.cashierId = parseInt(cashierId);
    }

    if (branchId) {
      where.branchId = parseInt(branchId);
    }

    if (startDate || endDate) {
      where.reportDate = {};
      if (startDate) {
        where.reportDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.reportDate.lte = new Date(endDate);
      }
    }

    return this.prisma.cashierReport.findMany({
      where,
      include: {
        cashier: true,
        branch: true,
      },
      orderBy: {
        reportDate: 'desc',
      },
      take: limit === 'all' ? undefined : parseInt(limit),
    });
  }

  async findOne(id: number) {
    return this.prisma.cashierReport.findUnique({
      where: { id },
      include: {
        cashier: true,
        branch: true,
      },
    });
  }

  async update(id: number, updateCashierReportDto: UpdateCashierReportDto) {
    return this.prisma.cashierReport.update({
      where: { id },
      data: updateCashierReportDto,
      include: {
        cashier: true,
        branch: true,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.cashierReport.delete({
      where: { id },
    });
  }

  async getCashierReport(cashierId: number, branchId: number, startDate: Date, endDate: Date) {
    const hasBranch = typeof branchId === 'number' && !Number.isNaN(branchId);
    return this.generateCashierReport(cashierId, hasBranch ? branchId : null, startDate, endDate);
  }

  private async generateCashierReport(
    cashierId: number,
    branchId: number | null,
    startDate: Date,
    endDate: Date,
  ) {
    const whereClause: any = {
      type: 'SALE',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      AND: [
        {
          OR: [
            { soldByUserId: cashierId },
            { userId: cashierId },
          ],
        },
      ],
    };

    if (branchId != null) {
      whereClause.AND.push({
        OR: [
          { fromBranchId: branchId },
          { toBranchId: branchId },
        ],
      });
    }

    // Get all transactions for the cashier in the date range
    const transactions = await this.prisma.transaction.findMany({
      where: whereClause,
      include: {
        items: true,
        customer: true,
        paymentSchedules: true,
        payments: true,
      },
    });

    // Get daily repayments
    const dailyRepayments = await this.prisma.dailyRepayment.findMany({
      where: {
        paidByUserId: cashierId,
        ...(branchId != null ? { branchId } : {}),
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        transaction: {
          include: {
            customer: true,
            soldBy: true,
            user: true,
          },
        },
        paidBy: true,
      },
    });

    // Get credit repayments
    const creditRepayments = await this.prisma.creditRepayment.findMany({
      where: {
        paidByUserId: cashierId,
        ...(branchId != null ? { branchId } : {}),
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        transaction: {
          include: {
            customer: true,
            soldBy: true,
            user: true,
          },
        },
        paidBy: true,
      },
    });

    // Get defective logs
    const defectiveLogs = await this.prisma.defectiveLog.findMany({
      where: {
        OR: [
          { handledByUserId: cashierId },
          { userId: cashierId }
        ],
        ...(branchId != null ? { branchId } : {}),
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate totals
    let cashTotal = 0;
    let cardTotal = 0;
    let terminalTotal = 0;
    let thirdPartyTotal = 0;
    let tovarTotal = 0;
    let uydanTotal = 0;
    let creditTotal = 0;
    let installmentTotal = 0;
    let upfrontTotal = 0;
    let upfrontCash = 0;
    let upfrontCard = 0;
    let upfrontTerminal = 0;
    let upfrontThird = 0;
    let soldQuantity = 0;
    let soldAmount = 0;
    let repaymentTotal = 0;
    let defectivePlus = 0;
    let defectiveMinus = 0;

    // Process transactions
    for (const transaction of transactions as any[]) {
      const finalTotal = Number(transaction.finalTotal || transaction.total || 0);
      const amountPaid = Number(transaction.amountPaid || 0);
      const upfront = ['CREDIT', 'INSTALLMENT'].includes(transaction.paymentType || '') ? amountPaid : 0;

      const paymentsArr = Array.isArray(transaction.payments) ? transaction.payments : [];
      const hasSplitPayments = paymentsArr.length > 0;

      if (hasSplitPayments) {
        for (const p of paymentsArr) {
          const amt = Number(p.amount || 0);
          if (!amt || Number.isNaN(amt)) continue;
          const m = String(p.method || '').toUpperCase().trim();

          if (['CREDIT', 'INSTALLMENT'].includes(transaction.paymentType || '')) {
            upfrontTotal += amt;
            if (m === 'CASH') upfrontCash += amt;
            else if (m === 'CARD') upfrontCard += amt;
            else if (m === 'THIRD_PARTY') upfrontThird += amt;
            else if (m === 'TERMINAL') upfrontTerminal += amt;
          } else {
            if (m === 'CASH') cashTotal += amt;
            else if (m === 'CARD') cardTotal += amt;
            else if (m === 'TERMINAL') terminalTotal += amt;
            else if (m === 'THIRD_PARTY') thirdPartyTotal += amt;
            else if (m === 'TOVAR') tovarTotal += amt;
            else if (m === 'UYDAN') uydanTotal += amt;
          }
        }
      } else {
        const pType = String(transaction.paymentType || '').toUpperCase().trim();
        switch (pType) {
          case 'CASH':
            cashTotal += finalTotal;
            break;
          case 'CARD':
            cardTotal += finalTotal;
            break;
          case 'TERMINAL':
            terminalTotal += finalTotal;
            break;
          case 'THIRD_PARTY':
            thirdPartyTotal += finalTotal;
            break;
          case 'TOVAR':
            tovarTotal += finalTotal;
            break;
          case 'UYDAN':
            uydanTotal += finalTotal;
            break;
          case 'CREDIT':
          case 'INSTALLMENT':
            const upType = String(transaction.upfrontPaymentType || 'CASH').toUpperCase().trim();
            upfrontTotal += upfront;
            if (upType === 'CASH') upfrontCash += upfront;
            else if (upType === 'CARD') upfrontCard += upfront;
            else if (upType === 'TERMINAL') upfrontTerminal += upfront;
            else if (upType === 'THIRD_PARTY') upfrontThird += upfront;
            break;
        }
      }

      if (transaction.paymentType === 'CREDIT') creditTotal += finalTotal;
      if (transaction.paymentType === 'INSTALLMENT') installmentTotal += finalTotal;

      // Calculate sold quantity and amount
      for (const item of transaction.items) {
        soldQuantity += Number(item.quantity || 0);
        soldAmount += Number(item.total || 0);
      }
    }

    const seenRepayments = new Set<string>();
    const mappedRepayments: any[] = [];

    // Process daily repayments
    for (const repayment of dailyRepayments) {
      const amt = Number(repayment.amount || 0);
      if (!amt) continue;
      const repayKey = `${repayment.transactionId}:${amt}:${new Date(repayment.paidAt).toISOString()}`;
      if (seenRepayments.has(repayKey)) continue;
      seenRepayments.add(repayKey);

      repaymentTotal += amt;
      mappedRepayments.push({
        id: repayment.id,
        scheduleId: `daily-${repayment.id}`,
        transactionId: repayment.transactionId,
        amount: amt,
        channel: (repayment.channel || 'CASH').toUpperCase(),
        month: 'Кунлик',
        paidAt: repayment.paidAt,
        customer: repayment.transaction?.customer || null,
        paidBy: repayment.paidBy || { id: repayment.paidByUserId },
        soldBy: repayment.transaction?.soldBy || null,
      });
    }

    // Process credit repayments
    for (const repayment of creditRepayments) {
      const amt = Number(repayment.amount || 0);
      if (!amt) continue;
      const repayKey = `${repayment.transactionId}:${amt}:${new Date(repayment.paidAt).toISOString()}`;
      if (seenRepayments.has(repayKey)) continue;
      seenRepayments.add(repayKey);

      repaymentTotal += amt;
      mappedRepayments.push({
        id: repayment.id,
        scheduleId: repayment.scheduleId || `credit-${repayment.id}`,
        transactionId: repayment.transactionId,
        amount: amt,
        channel: (repayment.channel || 'CASH').toUpperCase(),
        month: repayment.month || '-',
        paidAt: repayment.paidAt,
        customer: repayment.transaction?.customer || null,
        paidBy: repayment.paidBy || { id: repayment.paidByUserId },
        soldBy: repayment.transaction?.soldBy || null,
      });
    }

    // Process defective logs (same as defectiveLogService.getByCashier logic)
    for (const log of defectiveLogs) {
      const raw = Number(log.cashAmount ?? 0) || 0;
      const dir = String(log.cashAdjustmentDirection || '').toUpperCase();
      let signed = dir === 'MINUS' ? -Math.abs(raw) : dir === 'PLUS' ? Math.abs(raw) : raw;
      const isReturn = String(log.actionType || '').toUpperCase() === 'RETURN';
      if ((Number.isNaN(signed) ? 0 : signed) === 0 && isReturn) {
        const txId = log.transactionId ? Number(log.transactionId) : null;
        if (txId) {
          const tx = await this.prisma.transaction.findUnique({
            where: { id: txId },
            include: { items: true },
          });
          if (tx && Array.isArray(tx.items)) {
            const it = tx.items.find((ii: any) => Number(ii.productId) === Number(log.productId));
            const unit = Number((it?.sellingPrice ?? it?.price) || 0);
            const qty = Number(log.quantity || 0);
            if (unit > 0 && qty > 0) {
              signed = -Math.abs(unit * qty);
            }
          }
        }
      }
      if (Number.isNaN(signed)) signed = 0;
      if (signed > 0) {
        defectivePlus += signed;
      } else if (signed < 0) {
        defectiveMinus += Math.abs(signed);
      }
    }

    const reportDataEnriched: any = {
      cashierId,
      reportDate: startDate,
      cashTotal,
      cardTotal,
      terminalTotal,
      thirdPartyTotal,
      tovarTotal,
      uydanTotal,
      creditTotal,
      installmentTotal,
      upfrontTotal,
      upfrontCash,
      upfrontCard,
      upfrontTerminal,
      upfrontThird,
      soldQuantity,
      soldAmount,
      repaymentTotal,
      defectivePlus,
      defectiveMinus,
      repayments: mappedRepayments,
    };

    if (branchId != null) {
      const reportDataDb = {
        cashierId,
        branchId,
        reportDate: startDate,
        cashTotal,
        cardTotal: cardTotal + terminalTotal,
        creditTotal,
        installmentTotal,
        upfrontTotal,
        upfrontCash,
        upfrontCard: upfrontCard + upfrontTerminal,
        soldQuantity,
        soldAmount,
        repaymentTotal,
        defectivePlus,
        defectiveMinus,
      };

      const dbRecord = await this.prisma.cashierReport.upsert({
        where: {
          cashierId_branchId_reportDate: {
            cashierId,
            branchId,
            reportDate: startDate,
          },
        },
        update: reportDataDb,
        create: reportDataDb,
        include: {
          cashier: true,
          branch: true,
        },
      });

      return {
        ...dbRecord,
        ...reportDataEnriched,
      };
    }

    return {
      id: 0,
      ...reportDataEnriched,
      cashier: null,
      branch: null,
    } as any;
  }
}
