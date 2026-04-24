import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditRepaymentDto } from './dto/create-credit-repayment.dto';
import { UpdateCreditRepaymentDto } from './dto/update-credit-repayment.dto';

@Injectable()
export class CreditRepaymentService {
  constructor(private prisma: PrismaService) {}

  async create(createCreditRepaymentDto: CreateCreditRepaymentDto) {
    const { transactionId, scheduleId, amount, channel, month, monthNumber, paidAt, paidByUserId, branchId } = createCreditRepaymentDto;
    
    return this.prisma.creditRepayment.create({
      data: {
        transactionId,
        scheduleId,
        amount,
        channel,
        month:month?.toString(),
        monthNumber,
        paidAt: new Date(paidAt),
        paidByUserId,
        branchId,
      },
      include: {
        transaction: true,
        schedule: true,
        paidBy: true,
        branch: true,
      },
    });
  }

  async findAll(query: any) {
    const { transactionId, scheduleId, branchId, paidByUserId, month, startDate, endDate } = query;

    const where: any = {};

    // Handle transactionId and scheduleId with OR logic if both provided
    if (transactionId && scheduleId) {
      where.OR = [
        { transactionId: parseInt(transactionId) },
        { scheduleId: parseInt(scheduleId) }
      ];
    } else {
      if (transactionId) where.transactionId = parseInt(transactionId);
      if (scheduleId) where.scheduleId = parseInt(scheduleId);
    }

    if (branchId) where.branchId = parseInt(branchId);
    if (paidByUserId) where.paidByUserId = parseInt(paidByUserId);
    if (month) where.month = String(month);

    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = new Date(startDate);
      if (endDate) where.paidAt.lte = new Date(endDate);
    }

    return this.prisma.creditRepayment.findMany({
      where,
      include: {
        transaction: true,
        schedule: true,
        paidBy: true,
        branch: true,
      },
      orderBy: {
        paidAt: 'desc',
      },
    });
  }

  async findByUser(
    userId: number,
    branchId?: number,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {
      paidByUserId: userId,
    };
    
    if (branchId) where.branchId = branchId;
    
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = new Date(startDate);
      if (endDate) where.paidAt.lte = new Date(endDate);
    }

    return this.prisma.creditRepayment.findMany({
      where,
      include: {
        transaction: {
          include: {
            customer: true,
            soldBy: true,
          },
        },
        schedule: true,
        paidBy: true,
        branch: true,
      },
      orderBy: {
        paidAt: 'desc',
      },
    });
  }

  async findByCashier(
    cashierId: number,
    branchId?: string | number,
    startDate?: string,
    endDate?: string,
  ) {
    
    const where: any = {
      paidByUserId: cashierId,
    };
    
    if (branchId) {
      const branchIdNum = typeof branchId === 'string' ? parseInt(branchId) : branchId;
      if (!isNaN(branchIdNum)) {
        where.branchId = branchIdNum;
      } else {
      }
    }
    
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) {
        where.paidAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.paidAt.lte = new Date(endDate);
      }
    }


    const result = await this.prisma.creditRepayment.findMany({
      where,
      include: {
        transaction: {
          include: {
            customer: true,
            soldBy: true,
          },
        },
        schedule: true,
        paidBy: true,
        branch: true,
      },
      orderBy: {
        paidAt: 'desc',
      },
    });

    return result;
  }

  async findOne(id: number) {
    return this.prisma.creditRepayment.findUnique({
      where: { id },
      include: {
        transaction: true,
        schedule: true,
        paidBy: true,
        branch: true,
      },
    });
  }

  async update(id: number, updateCreditRepaymentDto: UpdateCreditRepaymentDto) {
    const { amount, channel, month, monthNumber, paidAt, paidByUserId, branchId } = updateCreditRepaymentDto;
    
    return this.prisma.creditRepayment.update({
      where: { id },
      data: {
        amount,
        channel,
        month,
        monthNumber,
        paidAt: paidAt ? new Date(paidAt) : undefined,
        paidByUserId,
        branchId,
      },
      include: {
        transaction: true,
        schedule: true,
        paidBy: true,
        branch: true,
      },
    });
  }

  async remove(id: number) {
    // Perform a transactional revert: delete creditRepayment, remove linked paymentRepayment
    // and adjust paymentSchedule / transaction / branch cash balances accordingly.
    const existing = await this.prisma.creditRepayment.findUnique({ where: { id } });
    if (!existing) return null;

    return this.prisma.$transaction(async (tx) => {
      // delete the credit repayment record
      const deleted = await tx.creditRepayment.delete({ where: { id } });

      // Helper: try to decrement branch cash if payment was CASH
      const tryDecrementBranchCash = async (branchId: number | null, amount: number, channel?: string) => {
        if (!branchId) return;
        if ((String(channel || 'CASH').toUpperCase()) !== 'CASH') return;
        try {
          await tx.branch.update({ where: { id: branchId }, data: { cashBalance: { decrement: amount } } });
        } catch (_) { /* ignore */ }
      };

      // If this repayment belonged to a payment schedule, revert schedule and related paymentRepayment
      if (existing.scheduleId) {
        // attempt to find a matching PaymentRepayment row for this schedule
        const candidates = await tx.paymentRepayment.findMany({
          where: { scheduleId: existing.scheduleId, amount: existing.amount },
          orderBy: { paidAt: 'desc' },
          take: 5,
        });

        let matched = null as any;
        if (candidates.length === 1) matched = candidates[0];
        else if (candidates.length > 1) {
          if (existing.paidAt) {
            const paidAtTime = new Date(existing.paidAt).getTime();
            matched = candidates.find((c) => Math.abs(new Date(c.paidAt).getTime() - paidAtTime) < 5000) || candidates[0];
          } else {
            matched = candidates[0];
          }
        }

        if (matched) {
          try {
            await tx.paymentRepayment.delete({ where: { id: matched.id } });
          } catch (_) { /* ignore */ }
        }

        // Adjust payment schedule paidAmount / isPaid / remainingBalance
        const schedule = await tx.paymentSchedule.findUnique({ where: { id: existing.scheduleId } });
        if (schedule) {
          const currentPaid = Number(schedule.paidAmount || 0);
          const newPaid = Math.max(0, currentPaid - Number(existing.amount || 0));
          const paymentTarget = Number(schedule.payment || 0);
          const updateData: any = {
            paidAmount: newPaid,
            isPaid: newPaid >= paymentTarget,
          };

          // For daily installments also adjust remainingBalance
          if (schedule.isDailyInstallment) {
            const currentRemaining = Number(schedule.remainingBalance || 0);
            updateData.remainingBalance = Math.max(0, currentRemaining + Number(existing.amount || 0));
          }

          try {
            await tx.paymentSchedule.update({ where: { id: schedule.id }, data: updateData });
          } catch (_) { /* ignore */ }
        }

        // Adjust parent transaction totals
        try {
          const txRec = await tx.transaction.findUnique({ where: { id: existing.transactionId } });
          if (txRec) {
            const currentCredit = Number(txRec.creditRepaymentAmount || 0);
            const newCredit = Math.max(0, currentCredit - Number(existing.amount || 0));
            const baseAmount = Number(txRec.finalTotal || txRec.total || 0);
            const down = Number(txRec.downPayment || 0);
            const newRemaining = Math.max(0, baseAmount - down - newCredit);
            await tx.transaction.update({ where: { id: txRec.id }, data: { creditRepaymentAmount: newCredit, remainingBalance: newRemaining } });
          }
        } catch (_) { /* ignore */ }

        // Decrement branch cash if applicable
        await tryDecrementBranchCash(existing.branchId || null, Number(existing.amount || 0), existing.channel);
      } else {
        // Transaction-level repayment (no schedule) — adjust transaction totals
        try {
          const txRec = await tx.transaction.findUnique({ where: { id: existing.transactionId } });
          if (txRec) {
            const currentCredit = Number(txRec.creditRepaymentAmount || 0);
            const newCredit = Math.max(0, currentCredit - Number(existing.amount || 0));
            const baseAmount = Number(txRec.finalTotal || txRec.total || 0);
            const down = Number(txRec.downPayment || 0);
            const newRemaining = Math.max(0, baseAmount - down - newCredit);
            await tx.transaction.update({ where: { id: txRec.id }, data: { creditRepaymentAmount: newCredit, remainingBalance: newRemaining } });
          }
        } catch (_) { /* ignore */ }

        await tryDecrementBranchCash(existing.branchId || null, Number(existing.amount || 0), existing.channel);
      }

      return deleted;
    });
  }
}
