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
      let inflow = 0;
      let outflow = 0;

      if (createTransactionDto.type === TransactionType.SALE || createTransactionDto.type === TransactionType.WRITE_OFF) {
        if (product.quantity < createTransactionDto.quantity) throw new Error('Insufficient stock');
        quantityUpdate -= createTransactionDto.quantity;
        outflow = createTransactionDto.quantity; // Record as outflow
      } else if (createTransactionDto.type === TransactionType.RETURN || createTransactionDto.type === TransactionType.TRANSFER) {
        quantityUpdate += createTransactionDto.quantity;
        inflow = createTransactionDto.quantity; // Record as inflow
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
          inflow, // Save inflow
          outflow, // Save outflow
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
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({ where: { id } });
      if (!transaction) throw new Error('Transaction not found');

      const product = await tx.product.findUnique({ where: { id: transaction.productId } });
      if (!product) throw new Error('Product not found');

      let quantityUpdate = product.quantity;
      let inflow = transaction.inflow;
      let outflow = transaction.outflow;

      // Revert previous transaction effect
      if (transaction.type === TransactionType.SALE || transaction.type === TransactionType.WRITE_OFF) {
        quantityUpdate += transaction.quantity; // Add back previous outflow
      } else if (transaction.type === TransactionType.RETURN || transaction.type === TransactionType.TRANSFER) {
        quantityUpdate -= transaction.quantity; // Remove previous inflow
      }

      // Apply new transaction effect
      const newQuantity = updateTransactionDto.quantity ?? transaction.quantity;
      const newType = updateTransactionDto.type ?? transaction.type;

      if (newType === TransactionType.SALE || newType === TransactionType.WRITE_OFF) {
        if (quantityUpdate < newQuantity) throw new Error('Insufficient stock');
        quantityUpdate -= newQuantity;
        inflow = 0;
        outflow = newQuantity;
      } else if (newType === TransactionType.RETURN || newType === TransactionType.TRANSFER) {
        quantityUpdate += newQuantity;
        inflow = newQuantity;
        outflow = 0;
      }

      await tx.product.update({
        where: { id: transaction.productId },
        data: { quantity: quantityUpdate, updatedAt: new Date() },
      });

      return tx.transaction.update({
        where: { id },
        data: {
          ...updateTransactionDto,
          total: updateTransactionDto.quantity && updateTransactionDto.price ? updateTransactionDto.quantity * updateTransactionDto.price : undefined,
          inflow, // Update inflow
          outflow, // Update outflow
          updatedAt: new Date(),
        },
      });
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({ where: { id } });
      if (!transaction) throw new Error('Transaction not found');

      const product = await tx.product.findUnique({ where: { id: transaction.productId } });
      if (!product) throw new Error('Product not found');

      let quantityUpdate = product.quantity;

      // Revert transaction effect
      if (transaction.type === TransactionType.SALE || transaction.type === TransactionType.WRITE_OFF) {
        quantityUpdate += transaction.quantity; // Add back previous outflow
      } else if (transaction.type === TransactionType.RETURN || transaction.type === TransactionType.TRANSFER) {
        quantityUpdate -= transaction.quantity; // Remove previous inflow
      }

      await tx.product.update({
        where: { id: transaction.productId },
        data: { quantity: quantityUpdate, updatedAt: new Date() },
      });

      return tx.transaction.delete({ where: { id } });
    });
  }
}