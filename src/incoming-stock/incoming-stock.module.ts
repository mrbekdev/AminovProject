import { Module } from '@nestjs/common';
import { IncomingStockService } from './incoming-stock.service';
import { IncomingStockController } from './incoming-stock.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [IncomingStockController],
  providers: [IncomingStockService, PrismaService],
})
export class IncomingStockModule {}
