import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalaryPaymentDto } from './dto/create-salary-payment.dto';
import { UpdateSalaryPaymentDto } from './dto/update-salary-payment.dto';

@Injectable()
export class SalaryPaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateSalaryPaymentDto, createdById: number) {
    const { paymentDate, ...rest } = createDto;
    return this.prisma.salaryPayment.create({
      data: {
        ...rest,
        amount: Number(createDto.amount),
        userId: Number(createDto.userId),
        createdById: Number(createdById),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        branchId: createDto.branchId ? Number(createDto.branchId) : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });
  }

  async findAll(query: any) {
    const { userId, startDate, endDate, branchId, skip = 0, take = 100 } = query;
    const where: any = {};

    if (userId) {
      if (typeof userId === 'string' && userId.includes(',')) {
        where.userId = { in: userId.split(',').map((id: string) => +id.trim()) };
      } else {
        where.userId = +userId;
      }
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = new Date(startDate);
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        where.paymentDate.lte = eDate;
      }
    }

    if (branchId) {
      where.branchId = +branchId;
    }

    const [total, data] = await Promise.all([
      this.prisma.salaryPayment.count({ where }),
      this.prisma.salaryPayment.findMany({
        where,
        skip: +skip,
        take: +take,
        orderBy: { paymentDate: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              phone: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
      }),
    ]);

    const totalAmount = await this.prisma.salaryPayment.aggregate({
      where,
      _sum: { amount: true },
    });

    return {
      total,
      totalAmount: totalAmount._sum.amount || 0,
      data,
    };
  }

  async findByUserId(userId: number, startDate?: string, endDate?: string) {
    const where: any = { userId: +userId };

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = new Date(startDate);
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        where.paymentDate.lte = eDate;
      }
    }

    const data = await this.prisma.salaryPayment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });

    const sum = data.reduce((acc, item) => acc + (item.amount || 0), 0);

    return {
      totalAmount: sum,
      count: data.length,
      data,
    };
  }

  async findOne(id: number) {
    const payment = await this.prisma.salaryPayment.findUnique({
      where: { id: +id },
      include: {
        user: true,
        createdBy: true,
      },
    });
    if (!payment) {
      throw new NotFoundException('Salary payment not found');
    }
    return payment;
  }

  async update(id: number, updateDto: UpdateSalaryPaymentDto) {
    const { paymentDate, ...rest } = updateDto;
    return this.prisma.salaryPayment.update({
      where: { id: +id },
      data: {
        ...rest,
        amount: updateDto.amount !== undefined ? Number(updateDto.amount) : undefined,
        paymentDate: paymentDate ? new Date(paymentDate) : undefined,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    return this.prisma.salaryPayment.delete({
      where: { id: +id },
    });
  }
}
