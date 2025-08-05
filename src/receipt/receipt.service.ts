
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { PaymentType } from '@prisma/client';

@Injectable()
export class ReceiptService {
  constructor(private prisma: PrismaService) {}

  async create(createReceiptDto: CreateReceiptDto) {
    return this.prisma.$transaction(async (tx) => {
      let customer;
      if (createReceiptDto.customerId) {
        customer = await tx.customer.findUnique({ where: { id: createReceiptDto.customerId } });
        if (!customer) throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
      }

      if (createReceiptDto.id) {
        const existingTransaction = await tx.transaction.findUnique({
          where: { receiptId: createReceiptDto.id },
        });
        if (!existingTransaction) throw new HttpException('Associated transaction not found', HttpStatus.BAD_REQUEST);
      }

      const receipt = await tx.receipt.create({
        data: {
          id: createReceiptDto.id,
          customerId: createReceiptDto.customerId,
          cashier: createReceiptDto.cashier,
          date: new Date(createReceiptDto.date),
          items: createReceiptDto.items as any, // JSON type
          total: createReceiptDto.total,
          creditTotal: createReceiptDto.creditTotal,
          amountPaid: createReceiptDto.amountPaid,
          remainingBalance: createReceiptDto.remainingBalance,
          returnCode: createReceiptDto.returnCode,
          branchId: createReceiptDto.branchId,
          deliveryMethod: createReceiptDto.deliveryMethod,
          paymentMethod: createReceiptDto.paymentMethod,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return receipt;
    });
  }
}
