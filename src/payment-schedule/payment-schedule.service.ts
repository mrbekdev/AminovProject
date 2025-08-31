import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentScheduleService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: number) {
    const schedule = await this.prisma.paymentSchedule.findUnique({
      where: { id },
      include: {
        transaction: {
          include: {
            customer: true,
            items: {
              include: {
                product: true
              }
            }
          }
        },
        repayments: {
          include: { paidBy: true },
          orderBy: { paidAt: 'asc' }
        },
        paidBy: true
      }
    });

    if (!schedule) {
      throw new HttpException('Payment schedule not found', HttpStatus.NOT_FOUND);
    }

    return schedule;
  }

  async update(id: number, updateData: any) {
    console.log('Payment schedule update received:', { id, updateData });
    const { paidAmount, isPaid, paidAt, paidChannel, paidByUserId, amountDelta, rating, ...rest } = updateData;
    console.log('Extracted paidChannel:', { paidChannel, type: typeof paidChannel, isNull: paidChannel === null, isUndefined: paidChannel === undefined });

    // Read existing schedule and related data to compute deltas and targets
    const existing = await this.prisma.paymentSchedule.findUnique({
      where: { id },
      include: {
        transaction: true
      }
    });

    if (!existing) {
      throw new HttpException('Payment schedule not found', HttpStatus.NOT_FOUND);
    }

    const existingPaidAmount = existing.paidAmount || 0;
    const inputHasPaidAmount = paidAmount !== undefined && paidAmount !== null;
    const inputHasDelta = amountDelta !== undefined && amountDelta !== null;
    const deltaPaid = inputHasDelta
      ? Math.max(0, Number(amountDelta))
      : (inputHasPaidAmount ? Math.max(0, Number(paidAmount) - existingPaidAmount) : 0);
    const requestedPaidAmount = inputHasDelta
      ? existingPaidAmount + deltaPaid
      : (inputHasPaidAmount ? Number(paidAmount) : existingPaidAmount);
    const effectivePaidAt = paidAt ? new Date(paidAt) : (deltaPaid > 0 ? new Date() : undefined);

    // Build schedule update data
    const data: any = { ...rest };
    if (inputHasPaidAmount) data.paidAmount = requestedPaidAmount;
    if (typeof isPaid === 'boolean') data.isPaid = isPaid;
    if (effectivePaidAt) {
      data.paidAt = effectivePaidAt;
      data.repaymentDate = effectivePaidAt;
    }
    if (inputHasPaidAmount) data.creditRepaymentAmount = deltaPaid;
    if (paidChannel !== undefined && paidChannel !== null) data.paidChannel = paidChannel;
    if (paidByUserId) data.paidByUserId = Number(paidByUserId);
    if (rating) data.rating = rating;

    console.log('Final update data being saved:', data);

    // Execute as a single DB transaction to keep ledger consistent
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedSchedule = await tx.paymentSchedule.update({
        where: { id },
        data,
        include: {
          transaction: {
            include: {
              customer: true,
              items: { include: { product: true } }
            }
          }
        }
      });

              // Append a repayment history row and update branch cash if there is a positive delta
        if (deltaPaid > 0 && effectivePaidAt) {
          console.log('Creating PaymentRepayment with channel:', { paidChannel, type: typeof paidChannel, isNull: paidChannel === null, isUndefined: paidChannel === undefined });
          await tx.paymentRepayment.create({
            data: {
              transactionId: updatedSchedule.transactionId,
              scheduleId: updatedSchedule.id,
              amount: deltaPaid,
              channel: (paidChannel !== undefined && paidChannel !== null ? paidChannel : 'CASH') as any,
              paidAt: effectivePaidAt,
              paidByUserId: paidByUserId ? Number(paidByUserId) : null
            }
          });

        // Decide which branch cashbox to increment: prefer cashier's branch, fallback to transaction's fromBranch
        let targetBranchId: number | null = null;
        if (paidByUserId) {
          const cashier = await tx.user.findUnique({ where: { id: Number(paidByUserId) }, select: { branchId: true } });
          if (cashier && cashier.branchId) targetBranchId = cashier.branchId;
        }
        if (!targetBranchId && existing.transaction?.fromBranchId) {
          targetBranchId = existing.transaction.fromBranchId;
        }

        // Update branch cash only for CASH channel
        if (targetBranchId && ((paidChannel || 'CASH').toUpperCase() === 'CASH')) {
          await tx.branch.update({
            where: { id: targetBranchId },
            data: { cashBalance: { increment: deltaPaid } }
          });
        }

        // Update parent transaction last repayment date
        try {
          await tx.transaction.update({
            where: { id: existing.transactionId },
            data: { lastRepaymentDate: effectivePaidAt as any }
          });
        } catch (_) {}
      }

      return updatedSchedule;
    });

    return result;
  }
}
