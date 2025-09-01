import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyRepaymentDto } from './dto/create-daily-repayment.dto';
import { UpdateDailyRepaymentDto } from './dto/update-daily-repayment.dto';

@Injectable()
export class DailyRepaymentService {
  constructor(private prisma: PrismaService) {}

  async create(createDailyRepaymentDto: CreateDailyRepaymentDto) {
    return this.prisma.dailyRepayment.create({
      data: createDailyRepaymentDto,
      include: {
        transaction: true,
        paidBy: true,
      },
    });
  }

  async findAll(query: any = {}) {
    const { transactionId, paidByUserId, branchId, startDate, endDate, limit = 100 } = query;
    
    const where: any = {};
    
    if (transactionId) {
      where.transactionId = parseInt(transactionId);
    }
    
    if (paidByUserId) {
      where.paidByUserId = parseInt(paidByUserId);
    }
    
    if (branchId) {
      where.transaction = {
        fromBranchId: parseInt(branchId)
      };
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

    return this.prisma.dailyRepayment.findMany({
      where,
      include: {
        transaction: {
          include: {
            customer: true,
            soldBy: true,
          }
        },
        paidBy: true,
      },
      orderBy: {
        paidAt: 'desc',
      },
      take: limit === 'all' ? undefined : parseInt(limit),
    });
  }

  async findOne(id: number) {
    return this.prisma.dailyRepayment.findUnique({
      where: { id },
      include: {
        transaction: true,
        paidBy: true,
      },
    });
  }

  async update(id: number, updateDailyRepaymentDto: UpdateDailyRepaymentDto) {
    return this.prisma.dailyRepayment.update({
      where: { id },
      data: updateDailyRepaymentDto,
      include: {
        transaction: true,
        paidBy: true,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.dailyRepayment.delete({
      where: { id },
    });
  }

  async getCashierDailyRepayments(cashierId: number, branchId: number, startDate: Date, endDate: Date) {
    return this.prisma.dailyRepayment.findMany({
      where: {
        paidByUserId: cashierId,
        transaction: {
          fromBranchId: branchId,
        },
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        transaction: {
          include: {
            customer: true,
          }
        },
        paidBy: true,
      },
      orderBy: {
        paidAt: 'desc',
      },
    });
  }
}
