import { Module } from '@nestjs/common';
import { CashReconciliationService } from './cash-reconciliation.service';
import { CashReconciliationController } from './cash-reconciliation.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CashReconciliationController],
  providers: [CashReconciliationService],
  exports: [CashReconciliationService],
})
export class CashReconciliationModule {}
