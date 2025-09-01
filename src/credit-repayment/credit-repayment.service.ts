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
    const { transactionId, scheduleId, branchId, paidByUserId, startDate, endDate } = query;
    
    const where: any = {};
    
    if (transactionId) where.transactionId = parseInt(transactionId);
    if (scheduleId) where.scheduleId = parseInt(scheduleId);
    if (branchId) where.branchId = parseInt(branchId);
    if (paidByUserId) where.paidByUserId = parseInt(paidByUserId);
    
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

  async findByCashier(
    cashierId: number,
    branchId?: number,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {
      paidByUserId: cashierId,
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
    return this.prisma.creditRepayment.delete({
      where: { id },
    });
  }
}
