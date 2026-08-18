import { Module, Global } from '@nestjs/common';
import { ProductHistoryService } from './product-history.service';
import { ProductHistoryController } from './product-history.controller';
import { PrismaService } from '../prisma/prisma.service';

@Global()
@Module({
  controllers: [ProductHistoryController],
  providers: [ProductHistoryService, PrismaService],
  exports: [ProductHistoryService],
})
export class ProductHistoryModule {}
