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
        }
      }
    });

    if (!schedule) {
      throw new HttpException('Payment schedule not found', HttpStatus.NOT_FOUND);
    }

    return schedule;
  }

  async update(id: number, updateData: any) {
    const { paidAmount, isPaid, paidAt, ...rest } = updateData;

    // Read existing schedule to compute effective values and access transactionId
    const existing = await this.prisma.paymentSchedule.findUnique({
      where: { id },
      select: { transactionId: true, paidAmount: true, isPaid: true }
    });

    if (!existing) {
      throw new HttpException('Payment schedule not found', HttpStatus.NOT_FOUND);
    }

    const newPaidAmount = paidAmount !== undefined ? Number(paidAmount) : existing.paidAmount || 0;
    const effectivePaidAt = paidAt
      ? new Date(paidAt)
      : (newPaidAmount > 0 ? new Date() : undefined);

    const data: any = { ...rest };
    if (paidAmount !== undefined) data.paidAmount = newPaidAmount;
    if (typeof isPaid === 'boolean') data.isPaid = isPaid;
    if (effectivePaidAt) data.paidAt = effectivePaidAt;
    if (effectivePaidAt) data.repaymentDate = effectivePaidAt;
    if (paidAmount !== undefined) data.creditRepaymentAmount = newPaidAmount;

    const schedule = await this.prisma.paymentSchedule.update({
      where: { id },
      data,
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
        }
      }
    });

    // Update parent transaction with the last repayment date if we have a payment timestamp
    if (effectivePaidAt) {
      try {
        await this.prisma.transaction.update({
          where: { id: existing.transactionId },
          data: { lastRepaymentDate: effectivePaidAt as any }
        });
      } catch (e) {
        // If the column does not exist yet in DB, ignore silently to avoid breaking payment flow
      }
    }

    return schedule;
  }
}
