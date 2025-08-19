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

    const schedule = await this.prisma.paymentSchedule.update({
      where: { id },
      data: {
        paidAmount: paidAmount || 0,
        isPaid: isPaid || false,
        paidAt: paidAt ? new Date(paidAt) : null,
        ...rest
      },
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

    return schedule;
  }
}
