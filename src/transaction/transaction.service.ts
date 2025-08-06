import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto, CreateTransactionItemDto } from './dto/create-transaction.dto';
import { Prisma, Transaction } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    return this.prisma.$transaction(async (prisma) => {
      // Validate user
      const user = await prisma.user.findUnique({
        where: { id: createTransactionDto.userId },
      });
      if (!user) {
        throw new BadRequestException('Invalid user ID');
      }

      // Validate customer if provided
      if (createTransactionDto.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: createTransactionDto.customerId },
        });
        if (!customer) {
          throw new BadRequestException('Invalid customer ID');
        }
      }

      // Validate products and update stock
      for (const item of createTransactionDto.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new BadRequestException(`Invalid product ID: ${item.productId}`);
        }
        if (createTransactionDto.type === 'SALE' && product.quantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product: ${product.name}`);
        }
      }

      // Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          customerId: createTransactionDto.customerId,
          userId: createTransactionDto.userId,
          type: createTransactionDto.type,
          status: createTransactionDto.status || 'PENDING',
          discount: createTransactionDto.discount,
          total: createTransactionDto.total,
          finalTotal: createTransactionDto.finalTotal,
          paymentType: createTransactionDto.paymentType,
          deliveryMethod: createTransactionDto.deliveryMethod,
          amountPaid: createTransactionDto.amountPaid,
          remainingBalance: createTransactionDto.remainingBalance,
          receiptId: createTransactionDto.receiptId,
          items: {
            create: createTransactionDto.items.map((item: CreateTransactionItemDto) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              creditMonth: item.creditMonth,
              creditPercent: item.creditPercent,
              monthlyPayment: item.monthlyPayment,
            })),
          },
        },
        include: {
          items: true,
          user: true,
          customer: true,
        },
      });

      // Update product quantities and create stock history
      if (createTransactionDto.type === 'SALE') {
        for (const item of createTransactionDto.items) {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
          });

          // Check if product exists (should always be true due to earlier validation)
          if (!product) {
            throw new BadRequestException(`Product not found: ${item.productId}`);
          }

          await prisma.product.update({
            where: { id: item.productId },
            data: {
              quantity: { decrement: item.quantity },
            },
          });

          await prisma.productStockHistory.create({
            data: {
              productId: item.productId,
              transactionId: transaction.id,
              branchId: product.branchId, // Safe access after null check
              quantity: item.quantity,
              type: 'OUTFLOW',
              createdById: createTransactionDto.userId,
            },
          });
        }
      }

      return transaction;
    });
  }

  async findAll(): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findOne(id: number): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return this.prisma.transaction.update({
      where: { id },
      data: {
        customerId: updateTransactionDto.customerId,
        status: updateTransactionDto.status,
        discount: updateTransactionDto.discount,
        finalTotal: updateTransactionDto.finalTotal,
        paymentType: updateTransactionDto.paymentType,
        deliveryMethod: updateTransactionDto.deliveryMethod,
        amountPaid: updateTransactionDto.amountPaid,
        remainingBalance: updateTransactionDto.remainingBalance,
        receiptId: updateTransactionDto.receiptId,
      },
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async remove(id: number): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    await this.prisma.$transaction(async (prisma) => {
      // Delete related transaction items
      await prisma.transactionItem.deleteMany({
        where: { transactionId: id },
      });

      // Delete related stock history
      await prisma.productStockHistory.deleteMany({
        where: { transactionId: id },
      });

      // Delete the transaction
      await prisma.transaction.delete({
        where: { id },
      });
    });
  }
}