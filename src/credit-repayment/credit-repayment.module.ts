import { Module } from '@nestjs/common';
import { CreditRepaymentService } from './credit-repayment.service';
import { CreditRepaymentController } from './credit-repayment.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CreditRepaymentController],
  providers: [CreditRepaymentService],
  exports: [CreditRepaymentService],
})
export class CreditRepaymentModule {}
