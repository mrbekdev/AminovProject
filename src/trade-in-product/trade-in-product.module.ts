import { Module } from '@nestjs/common';
import { TradeInProductService } from './trade-in-product.service';
import { TradeInProductController } from './trade-in-product.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CurrencyExchangeRateModule } from '../currency-exchange-rate/currency-exchange-rate.module';
import { ProductHistoryModule } from '../product-history/product-history.module';

@Module({
  imports: [PrismaModule, CurrencyExchangeRateModule, ProductHistoryModule],
  controllers: [TradeInProductController],
  providers: [TradeInProductService],
  exports: [TradeInProductService],
})
export class TradeInProductModule {}
