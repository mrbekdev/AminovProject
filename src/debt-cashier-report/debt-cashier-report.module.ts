import { Module } from '@nestjs/common';
import { DebtCashierReportService } from './debt-cashier-report.service';
import { DebtCashierReportController } from './debt-cashier-report.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DebtCashierReportController],
  providers: [DebtCashierReportService],
  exports: [DebtCashierReportService],
})
export class DebtCashierReportModule {}
