import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentType } from '@prisma/client';
import { CreateReceiptDto } from './dto/create-receipt.dto';

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