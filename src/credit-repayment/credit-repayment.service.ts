import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditRepaymentDto } from './dto/create-credit-repayment.dto';
import { UpdateCreditRepaymentDto } from './dto/update-credit-repayment.dto';

@Injectable()
export class CreditRepaymentService {
  constructor(private prisma: PrismaService) {}

  async create(createCreditRepaymentDto: CreateCreditRepaymentDto) {
    return this.prisma.creditRepayment.create({
      data: createCreditRepaymentDto,
      include: {
        transaction: true,
        schedule: true,
        paidBy: true,
      },
    });
  }

  async findAll(query: any = {}) {
    const { transactionId, scheduleId, paidByUserId, branchId, startDate, endDate, limit = 100 } = query;
    
    const where: any = {};
    
    if (transactionId) {
      where.transactionId = parseInt(transactionId);
    }
    
    if (scheduleId) {
      where.scheduleId = parseInt(scheduleId);
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

    return this.prisma.creditRepayment.findMany({
      where,
      include: {
        transaction: {
          include: {
            customer: true,
            soldBy: true,
          }
        },
        schedule: true,
        paidBy: true,
      },
      orderBy: {
        paidAt: 'desc',
      },
      take: limit === 'all' ? undefined : parseInt(limit),
    });
  }

  async findOne(id: number) {
    return this.prisma.creditRepayment.findUnique({
      where: { id },
      include: {
        transaction: true,
        schedule: true,
        paidBy: true,
      },
    });
  }

  async update(id: number, updateCreditRepaymentDto: UpdateCreditRepaymentDto) {
    return this.prisma.creditRepayment.update({
      where: { id },
      data: updateCreditRepaymentDto,
      include: {
        transaction: true,
        schedule: true,
        paidBy: true,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.creditRepayment.delete({
      where: { id },
    });
  }

  async getCashierCreditRepayments(cashierId: number, branchId: number, startDate: Date, endDate: Date) {
    return this.prisma.creditRepayment.findMany({
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
        schedule: true,
        paidBy: true,
      },
      orderBy: {
        paidAt: 'desc',
      },
    });
  }
}
