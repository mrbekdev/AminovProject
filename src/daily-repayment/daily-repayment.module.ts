import { Module } from '@nestjs/common';
import { DailyRepaymentService } from './daily-repayment.service';
import { DailyRepaymentController } from './daily-repayment.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DailyRepaymentController],
  providers: [DailyRepaymentService],
  exports: [DailyRepaymentService],
})
export class DailyRepaymentModule {}
