import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyRepaymentDto } from './dto/create-daily-repayment.dto';
import { UpdateDailyRepaymentDto } from './dto/update-daily-repayment.dto';

@Injectable()
export class DailyRepaymentService {
  constructor(private prisma: PrismaService) {}

  async create(createDailyRepaymentDto: CreateDailyRepaymentDto) {
    const { transactionId, amount, channel, paidAt, paidByUserId, branchId } = createDailyRepaymentDto;
    
    return this.prisma.dailyRepayment.create({
      data: {
        transactionId,
        amount,
        channel,
        paidAt: new Date(paidAt),
        paidByUserId,
        branchId,
      },
      include: {
        transaction: true,
        paidBy: true,
        branch: true,
      },
    });
  }

  async findAll(query: any) {
    const { transactionId, branchId, paidByUserId, startDate, endDate } = query;
    
    const where: any = {};
    
    if (transactionId) where.transactionId = parseInt(transactionId);
    if (branchId) where.branchId = parseInt(branchId);
    if (paidByUserId) where.paidByUserId = parseInt(paidByUserId);
    
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = new Date(startDate);
      if (endDate) where.paidAt.lte = new Date(endDate);
    }

    return this.prisma.dailyRepayment.findMany({
      where,
      include: {
        transaction: true,
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
      }
    }
    
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = new Date(startDate);
      if (endDate) where.paidAt.lte = new Date(endDate);
    }

    return this.prisma.dailyRepayment.findMany({
      where,
      include: {
        transaction: {
          include: {
            customer: true,
          },
        },
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
    branchId?: string | number,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {
      paidByUserId: userId,
    };
    
    if (branchId) {
      const branchIdNum = typeof branchId === 'string' ? parseInt(branchId) : branchId;
      if (!isNaN(branchIdNum)) {
        where.branchId = branchIdNum;
      }
    }
    
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = new Date(startDate);
      if (endDate) where.paidAt.lte = new Date(endDate);
    }

    return this.prisma.dailyRepayment.findMany({
      where,
      include: {
        transaction: {
          include: {
            customer: true,
          },
        },
        paidBy: true,
        branch: true,
      },
      orderBy: {
        paidAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.dailyRepayment.findUnique({
      where: { id },
      include: {
        transaction: true,
        paidBy: true,
        branch: true,
      },
    });
  }

  async update(id: number, updateDailyRepaymentDto: UpdateDailyRepaymentDto) {
    const { amount, channel, paidAt, paidByUserId, branchId } = updateDailyRepaymentDto;
    
    return this.prisma.dailyRepayment.update({
      where: { id },
      data: {
        amount,
        channel,
        paidAt: paidAt ? new Date(paidAt) : undefined,
        paidByUserId,
        branchId,
      },
      include: {
        transaction: true,
        paidBy: true,
        branch: true,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.dailyRepayment.delete({
      where: { id },
    });
  }
}
