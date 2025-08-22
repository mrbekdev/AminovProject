import { Module } from '@nestjs/common';
import { CurrencyExchangeRateService } from './currency-exchange-rate.service';
import { CurrencyExchangeRateController } from './currency-exchange-rate.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CurrencyExchangeRateController],
  providers: [CurrencyExchangeRateService],
  exports: [CurrencyExchangeRateService],
})
export class CurrencyExchangeRateModule {}
