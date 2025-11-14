import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyExpenseDto } from './dto/create-daily-expense.dto';
import { UpdateDailyExpenseDto } from './dto/update-daily-expense.dto';

@Injectable()
export class DailyExpenseService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateDailyExpenseDto) {
    return this.prisma.dailyExpense.create({ data: { amount: dto.amount, reason: dto.reason, description: dto.description } });
  }

  findAll() {
    return this.prisma.dailyExpense.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: number) {
    const item = await this.prisma.dailyExpense.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Expense not found');
    return item;
  }

  async update(id: number, dto: UpdateDailyExpenseDto) {
    const exists = await this.prisma.dailyExpense.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Expense not found');
    return this.prisma.dailyExpense.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const exists = await this.prisma.dailyExpense.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Expense not found');
    return this.prisma.dailyExpense.delete({ where: { id } });
  }
}
