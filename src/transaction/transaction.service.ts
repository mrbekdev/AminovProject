import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionStatus, TransactionType, StockHistoryType } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: createTransactionDto.productId } });
      if (!product) throw new Error('Product not found');

      const user = await tx.user.findUnique({ where: { id: createTransactionDto.userId } });
      if (!user) throw new Error('User not found');

      let quantityChange = 0;
      let stockHistoryType: StockHistoryType;
      let description: string | undefined;

      const transactionType = createTransactionDto.type as TransactionType;
      switch (transactionType) {
        case TransactionType.SALE:
        case TransactionType.WRITE_OFF:
          if (product.quantity < createTransactionDto.quantity) throw new Error('Insufficient stock');
          quantityChange = -createTransactionDto.quantity;
          stockHistoryType = StockHistoryType.OUTFLOW;
          description = transactionType === TransactionType.SALE ? 'Product sold' : 'Product written off';
          break;
        case TransactionType.RETURN:
        case TransactionType.TRANSFER:
          quantityChange = createTransactionDto.quantity;
          stockHistoryType = StockHistoryType.INFLOW;
          description = transactionType === TransactionType.RETURN ? 'Product returned' : 'Product transferred';
          break;
        case TransactionType.STOCK_ADJUSTMENT:
          quantityChange = createTransactionDto.quantity; // Can be positive or negative
          stockHistoryType = StockHistoryType.ADJUSTMENT;
          description = createTransactionDto.description || 'Manual stock adjustment';
          break;
        default:
          throw new Error('Invalid transaction type');
      }

      // Update product quantity
      const newQuantity = product.quantity + quantityChange;
      if (newQuantity < 0) throw new Error('Resulting stock cannot be negative');

      await tx.product.update({
        where: { id: createTransactionDto.productId },
        data: { quantity: newQuantity, updatedAt: new Date() },
      });

      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          productId: createTransactionDto.productId,
          userId: createTransactionDto.userId,
          type: transactionType,
          status: TransactionStatus.COMPLETED,
          quantity: Math.abs(createTransactionDto.quantity),
          price: createTransactionDto.price,
          total: createTransactionDto.price * createTransactionDto.quantity,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create stock history entry
      await tx.productStockHistory.create({
        data: {
          productId: createTransactionDto.productId,
          transactionId: transaction.id,
          branchId: product.branchId,
          quantity: quantityChange,
          type: stockHistoryType,
          description,
          createdById: createTransactionDto.userId,
          createdAt: new Date(),
        },
      });

      return transaction;
    });
  }

  async findOne(id: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { product: true, user: true, stockHistory: { include: { product: true } } },
    });
    if (!transaction) throw new Error('Transaction not found');
    return transaction;
  }

  async findAll(skip: number, take: number, filters?: { productId?: number; userId?: number; type?: TransactionType }) {
    return this.prisma.transaction.findMany({
      skip,
      take,
      where: filters,
      include: { product: true, user: true, stockHistory: { include: { product: true } } },
    });
  }

  async findStockHistory(
    skip: number,
    take: number,
    filters?: { productId?: number; branchId?: number; type?: StockHistoryType },
  ) {
    const stockHistory = await this.prisma.productStockHistory.findMany({
      skip,
      take,
      where: filters,
      include: { product: true, transaction: true, createdBy: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!stockHistory || stockHistory.length === 0) {
      throw new Error('No stock history found');
    }

    return stockHistory;
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: { product: true },
      });
      if (!transaction) throw new Error('Transaction not found');

      const product = transaction.product;
      let quantityChange = 0;
      let stockHistoryType: StockHistoryType;
      let description: string | undefined;

      // Revert previous transaction effect
      let currentQuantity = product.quantity;
      const previousType = transaction.type as TransactionType;
      if (previousType === TransactionType.SALE || previousType === TransactionType.WRITE_OFF) {
        currentQuantity += transaction.quantity; // Add back previous outflow
      } else if (previousType === TransactionType.RETURN || previousType === TransactionType.TRANSFER) {
        currentQuantity -= transaction.quantity; // Remove previous inflow
      } else if (previousType === TransactionType.STOCK_ADJUSTMENT) {
        currentQuantity -= transaction.quantity; // Revert previous adjustment
      }

      // Apply new transaction effect
      const newQuantity = updateTransactionDto.quantity ?? transaction.quantity;
      const newType = updateTransactionDto.type ?? (transaction.type as TransactionType);
      const newPrice = updateTransactionDto.price ?? transaction.price;

      switch (newType) {
        case TransactionType.SALE:
        case TransactionType.WRITE_OFF:
          if (currentQuantity < newQuantity) throw new Error('Insufficient stock');
          quantityChange = -newQuantity;
          stockHistoryType = StockHistoryType.OUTFLOW;
          description = newType === TransactionType.SALE ? 'Updated sale' : 'Updated write-off';
          break;
        case TransactionType.RETURN:
        case TransactionType.TRANSFER:
          quantityChange = newQuantity;
          stockHistoryType = StockHistoryType.INFLOW;
          description = newType === TransactionType.RETURN ? 'Updated return' : 'Updated transfer';
          break;
        case TransactionType.STOCK_ADJUSTMENT:
          quantityChange = newQuantity; // Can be positive or negative
          stockHistoryType = StockHistoryType.ADJUSTMENT;
          description = updateTransactionDto.description || 'Updated stock adjustment';
          break;
        default:
          throw new Error('Invalid transaction type');
      }

      // Update product quantity
      const finalQuantity = currentQuantity + quantityChange;
      if (finalQuantity < 0) throw new Error('Resulting stock cannot be negative');

      await tx.product.update({
        where: { id: product.id },
        data: { quantity: finalQuantity, updatedAt: new Date() },
      });

      // Update transaction
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          type: newType,
          quantity: Math.abs(newQuantity),
          price: newPrice,
          total: newQuantity * newPrice,
          updatedAt: new Date(),
        },
      });

      // Create new stock history entry
      await tx.productStockHistory.create({
        data: {
          productId: product.id,
          transactionId: id,
          branchId: product.branchId,
          quantity: quantityChange,
          type: stockHistoryType,
          description,
          createdById: transaction.userId,
          createdAt: new Date(),
        },
      });

      return updatedTransaction;
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: { product: true },
      });
      if (!transaction) throw new Error('Transaction not found');

      const product = transaction.product;

      // Revert transaction effect
      let quantityUpdate = product.quantity;
      const transactionType = transaction.type as TransactionType;
      if (transactionType === TransactionType.SALE || transactionType === TransactionType.WRITE_OFF) {
        quantityUpdate += transaction.quantity; // Add back previous outflow
      } else if (transactionType === TransactionType.RETURN || transactionType === TransactionType.TRANSFER) {
        quantityUpdate -= transaction.quantity; // Remove previous inflow
      } else if (transactionType === TransactionType.STOCK_ADJUSTMENT) {
        quantityUpdate -= transaction.quantity; // Revert adjustment
      }

      if (quantityUpdate < 0) throw new Error('Resulting stock cannot be negative');

      // Update product
      await tx.product.update({
        where: { id: product.id },
        data: { quantity: quantityUpdate, updatedAt: new Date() },
      });

      // Create stock history entry for reversal
      await tx.productStockHistory.create({
        data: {
          productId: product.id,
          transactionId: null, // No transaction associated with deletion
          branchId: product.branchId,
          quantity:
            transaction.type === TransactionType.SALE || transaction.type === TransactionType.WRITE_OFF
              ? transaction.quantity
              : -transaction.quantity,
          type: StockHistoryType.ADJUSTMENT,
          description: `Reversed transaction of type ${transaction.type}`,
          createdById: transaction.userId,
          createdAt: new Date(),
        },
      });

      // Delete transaction
      return tx.transaction.delete({ where: { id } });
    });
  }
}