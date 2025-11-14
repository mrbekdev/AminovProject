import { Module } from '@nestjs/common';
import { DailyExpenseService } from './daily-expense.service';
import { DailyExpenseController } from './daily-expense.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [DailyExpenseController],
  providers: [DailyExpenseService, PrismaService],
})
export class DailyExpenseModule {}
