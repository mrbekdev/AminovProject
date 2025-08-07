import { Module } from '@nestjs/common';
import { ProductTransferService } from './product-transfer.service';
import { ProductTransferController } from './product-transfer.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ProductTransferController],
  providers: [ProductTransferService,PrismaService],
})
export class ProductTransferModule {}
