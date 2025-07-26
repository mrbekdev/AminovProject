import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionStatus, TransactionType, StockHistoryType, PaymentType } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: createTransactionDto.userId } });
      if (!user) throw new Error('User not found');

      if (createTransactionDto.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: createTransactionDto.customerId } });
        if (!customer) throw new Error('Customer not found');
      }

      let total = 0;
      const items = createTransactionDto.items;

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Product with ID ${item.productId} not found`);
        if (createTransactionDto.type === TransactionType.SALE && product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}`);
        }
        total += item.quantity * item.price;
      }

      const discount = createTransactionDto.discount ?? 0;
      const finalTotal = total - discount;

      const transaction = await tx.transaction.create({
        data: {
          customerId: createTransactionDto.customerId,
          userId: createTransactionDto.userId,
          type: createTransactionDto.type,
          status: TransactionStatus.COMPLETED,
          discount,
          total,
          finalTotal,
          paymentType: createTransactionDto.paymentType,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Product with ID ${item.productId} not found`);

        let quantityChange = 0;
        let stockHistoryType: StockHistoryType;
        let description: string;

        switch (createTransactionDto.type) {
          case TransactionType.SALE:
          case TransactionType.WRITE_OFF:
            quantityChange = -item.quantity;
            stockHistoryType = StockHistoryType.OUTFLOW;
            description = createTransactionDto.type === TransactionType.SALE ? 'Product sold' : 'Product written off';
            break;
          case TransactionType.RETURN:
          case TransactionType.TRANSFER:
            quantityChange = item.quantity;
            stockHistoryType = StockHistoryType.INFLOW;
            description = createTransactionDto.type === TransactionType.RETURN ? 'Product returned' : 'Product transferred';
            break;
          case TransactionType.STOCK_ADJUSTMENT:
            quantityChange = item.quantity;
            stockHistoryType = StockHistoryType.ADJUSTMENT;
            description = 'Manual stock adjustment';
            break;
          default:
            throw new Error('Invalid transaction type');
        }

        const newQuantity = product.quantity + quantityChange;
        if (newQuantity < 0) throw new Error(`Resulting stock for product ${product.name} cannot be negative`);

        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: newQuantity, updatedAt: new Date() },
        });

        await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await tx.productStockHistory.create({
          data: {
            productId: item.productId,
            transactionId: transaction.id,
            branchId: product.branchId,
            quantity: quantityChange,
            type: stockHistoryType,
            description,
            createdById: createTransactionDto.userId,
            createdAt: new Date(),
          },
        });
      }

      return transaction;
    });
  }

  async findOne(id: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        user: true,
        items: { include: { product: true } },
        stockHistory: { include: { product: true } },
      },
    });
    if (!transaction) throw new Error('Transaction not found');
    return transaction;
  }

  async findAll(skip: number, take: number, filters?: { customerId?: number; userId?: number; type?: TransactionType }) {
    return this.prisma.transaction.findMany({
      skip,
      take,
      where: filters,
      include: {
        customer: true,
        user: true,
        items: { include: { product: true } },
        stockHistory: { include: { product: true } },
      },
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
      include: { product: true, transaction: { include: { customer: true } }, createdBy: true },
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
        include: { items: { include: { product: true } } },
      });
      if (!transaction) throw new Error('Transaction not found');

      // Revert previous transaction effects
      const itemsToRevert = transaction.items ?? [];
      for (const item of itemsToRevert) {
        const product = item.product;
        if (!product) throw new Error(`Product with ID ${item.productId} not found`);

        let quantityChange = 0;
        if (transaction.type === TransactionType.SALE || transaction.type === TransactionType.WRITE_OFF) {
          quantityChange = item.quantity;
        } else if (transaction.type === TransactionType.RETURN || transaction.type === TransactionType.TRANSFER) {
          quantityChange = -item.quantity;
        } else if (transaction.type === TransactionType.STOCK_ADJUSTMENT) {
          quantityChange = -item.quantity;
        }

        const newQuantity = product.quantity + quantityChange;
        if (newQuantity < 0) throw new Error(`Resulting stock for product ${product.name} cannot be negative`);

        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: newQuantity, updatedAt: new Date() },
        });
      }

      // Delete old transaction items
      await tx.transactionItem.deleteMany({ where: { transactionId: id } });

      // Apply new transaction effects
      let total = 0;
      const items = updateTransactionDto.items ?? transaction.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Product with ID ${item.productId} not found`);
        if ((updateTransactionDto.type ?? transaction.type) === TransactionType.SALE && product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}`);
        }
        total += item.quantity * item.price;
      }

      const discount = updateTransactionDto.discount ?? transaction.discount ?? 0;
      const finalTotal = total - discount;

      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          customerId: updateTransactionDto.customerId ?? transaction.customerId,
          userId: updateTransactionDto.userId ?? transaction.userId,
          type: updateTransactionDto.type ?? transaction.type,
          discount,
          total,
          finalTotal,
          paymentType: updateTransactionDto.paymentType ?? transaction.paymentType,
          updatedAt: new Date(),
        },
      });

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Product with ID ${item.productId} not found`);

        let quantityChange = 0;
        let stockHistoryType: StockHistoryType;
        let description: string;

        const newType = updateTransactionDto.type ?? transaction.type;
        switch (newType) {
          case TransactionType.SALE:
          case TransactionType.WRITE_OFF:
            quantityChange = -item.quantity;
            stockHistoryType = StockHistoryType.OUTFLOW;
            description = newType === TransactionType.SALE ? 'Updated sale' : 'Updated write-off';
            break;
          case TransactionType.RETURN:
          case TransactionType.TRANSFER:
            quantityChange = item.quantity;
            stockHistoryType = StockHistoryType.INFLOW;
            description = newType === TransactionType.RETURN ? 'Updated return' : 'Updated transfer';
            break;
          case TransactionType.STOCK_ADJUSTMENT:
            quantityChange = item.quantity;
            stockHistoryType = StockHistoryType.ADJUSTMENT;
            description = 'Updated stock adjustment';
            break;
          default:
            throw new Error('Invalid transaction type');
        }

        const newQuantity = product.quantity + quantityChange;
        if (newQuantity < 0) throw new Error(`Resulting stock for product ${product.name} cannot be negative`);

        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: newQuantity, updatedAt: new Date() },
        });

        await tx.transactionItem.create({
          data: {
            transactionId: id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await tx.productStockHistory.create({
          data: {
            productId: item.productId,
            transactionId: id,
            branchId: product.branchId,
            quantity: quantityChange,
            type: stockHistoryType,
            description,
            createdById: updatedTransaction.userId,
            createdAt: new Date(),
          },
        });
      }

      return updatedTransaction;
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      });
      if (!transaction) throw new Error('Transaction not found');

      const itemsToRevert = transaction.items ?? [];
      for (const item of itemsToRevert) {
        const product = item.product;
        if (!product) throw new Error(`Product with ID ${item.productId} not found`);

        let quantityChange = 0;
        if (transaction.type === TransactionType.SALE || transaction.type === TransactionType.WRITE_OFF) {
          quantityChange = item.quantity;
        } else if (transaction.type === TransactionType.RETURN || transaction.type === TransactionType.TRANSFER) {
          quantityChange = -item.quantity;
        } else if (transaction.type === TransactionType.STOCK_ADJUSTMENT) {
          quantityChange = -item.quantity;
        }

        const newQuantity = product.quantity + quantityChange;
        if (newQuantity < 0) throw new Error(`Resulting stock for product ${product.name} cannot be negative`);

        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: newQuantity, updatedAt: new Date() },
        });

        await tx.productStockHistory.create({
          data: {
            productId: item.productId,
            transactionId: null,
            branchId: product.branchId,
            quantity: quantityChange,
            type: StockHistoryType.ADJUSTMENT,
            description: `Reversed transaction of type ${transaction.type}`,
            createdById: transaction.userId,
            createdAt: new Date(),
          },
        });
      }

      await tx.transactionItem.deleteMany({ where: { transactionId: id } });
      return tx.transaction.delete({ where: { id } });
    });
  }
}