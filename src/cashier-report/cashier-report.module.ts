import { Module } from '@nestjs/common';
import { CashierReportService } from './cashier-report.service';
import { CashierReportController } from './cashier-report.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CashierReportController],
  providers: [CashierReportService],
  exports: [CashierReportService],
})
export class CashierReportModule {}
