import { Module } from '@nestjs/common';
import { TransactionBonusProductService } from './transaction-bonus-product.service';
import { TransactionBonusProductController } from './transaction-bonus-product.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionBonusProductController],
  providers: [TransactionBonusProductService],
  exports: [TransactionBonusProductService],
})
export class TransactionBonusProductModule {}
