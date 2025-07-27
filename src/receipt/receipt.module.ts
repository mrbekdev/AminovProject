import { Module } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { ReceiptController } from './receipt.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ReceiptController],
  providers: [ReceiptService,PrismaService],
})
export class ReceiptModule {}
