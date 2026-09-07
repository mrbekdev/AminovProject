import { Module } from '@nestjs/common';
import { SalaryPaymentService } from './salary-payment.service';
import { SalaryPaymentController } from './salary-payment.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SalaryPaymentController],
  providers: [SalaryPaymentService],
  exports: [SalaryPaymentService],
})
export class SalaryPaymentModule {}
