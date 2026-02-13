import { Module } from '@nestjs/common';
import { PaymentScheduleService } from './payment-schedule.service';
import { PaymentScheduleController } from './payment-schedule.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentScheduleController],
  providers: [PaymentScheduleService],
  exports: [PaymentScheduleService],
})
export class PaymentScheduleModule {}
