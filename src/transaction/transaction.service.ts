import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionStatus, TransactionType } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: createTransactionDto.productId } });
      if (!product) throw new Error('Product not found');

      let quantityUpdate = product.quantity;
      if (createTransactionDto.type === TransactionType.SALE || createTransactionDto.type === TransactionType.WRITE_OFF) {
        if (product.quantity < createTransactionDto.quantity) throw new Error('Insufficient stock');
        quantityUpdate -= createTransactionDto.quantity;
      } else if (createTransactionDto.type === TransactionType.RETURN || createTransactionDto.type === TransactionType.TRANSFER) {
        quantityUpdate += createTransactionDto.quantity;
      }

      await tx.product.update({
        where: { id: createTransactionDto.productId },
        data: { quantity: quantityUpdate, updatedAt: new Date() },
      });

      return tx.transaction.create({
        data: {
          ...createTransactionDto,
          total: createTransactionDto.price * createTransactionDto.quantity,
          status: TransactionStatus.COMPLETED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    });
  }

  async findOne(id: number) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: { product: true, user: true },
    });
  }

  async findAll(skip: number, take: number, filters?: { productId?: number; userId?: number; type?: TransactionType }) {
    return this.prisma.transaction.findMany({
      skip,
      take,
      where: filters,
      include: { product: true, user: true },
    });
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...updateTransactionDto,
        total: updateTransactionDto.quantity && updateTransactionDto.price ? updateTransactionDto.quantity * updateTransactionDto.price : undefined,
        updatedAt: new Date(),
      },
    });
  }

  async remove(id: number) {
    return this.prisma.transaction.delete({ where: { id } });
  }
}