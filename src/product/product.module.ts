import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CurrencyExchangeRateModule } from '../currency-exchange-rate/currency-exchange-rate.module';

@Module({
  imports: [CurrencyExchangeRateModule],
  controllers: [ProductController],
  providers: [ProductService, PrismaService],
})
export class ProductModule {}
