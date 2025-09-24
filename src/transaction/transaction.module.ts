import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CurrencyExchangeRateModule } from '../currency-exchange-rate/currency-exchange-rate.module';
import { BonusModule } from '../bonus/bonus.module';

@Module({
  imports: [CurrencyExchangeRateModule, BonusModule],
  controllers: [TransactionController],
  providers: [TransactionService, PrismaService],
})
export class TransactionModule {}
