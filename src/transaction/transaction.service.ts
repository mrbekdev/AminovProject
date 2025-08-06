// transaction.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionStatus, TransactionType, StockHistoryType, PaymentType, ProductStatus } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      let customer;
      if (createTransactionDto.customerId) {
        customer = await tx.customer.findUnique({ where: { id: createTransactionDto.customerId } });
        if (!customer) throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
      }

      let total = 0;
      const items = createTransactionDto.items;

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new HttpException(`Product with ID ${item.productId} not found`, HttpStatus.NOT_FOUND);
        if (createTransactionDto.type === TransactionType.SALE && product.quantity < item.quantity) {
          throw new HttpException(`Insufficient stock for product ${product.name}`, HttpStatus.BAD_REQUEST);
        }
        total += item.quantity * item.price;
      }

      const discount = createTransactionDto.discount ?? 0;
      const finalTotal = createTransactionDto.finalTotal || total - discount;

      const transaction = await tx.transaction.create({
        data: {
          customerId: createTransactionDto.customerId,
          userId,
          type: createTransactionDto.type,
          status: TransactionStatus.COMPLETED,
          discount,
          total,
          finalTotal,
          paymentType: createTransactionDto.paymentType,
          deliveryMethod: createTransactionDto.deliveryMethod,
          amountPaid: createTransactionDto.amountPaid,
          remainingBalance: createTransactionDto.remainingBalance,
          receiptId: createTransactionDto.receiptId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new HttpException(`Product with ID ${item.productId} not found`, HttpStatus.NOT_FOUND);

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
            quantityChange = item.quantity;
            stockHistoryType = StockHistoryType.RETURN;
            description = 'Product returned';
            break;
          case TransactionType.TRANSFER:
            quantityChange = item.quantity;
            stockHistoryType = StockHistoryType.INFLOW;
            description = 'Product transferred';
            break;
          case TransactionType.STOCK_ADJUSTMENT:
            quantityChange = item.quantity;
            stockHistoryType = StockHistoryType.ADJUSTMENT;
            description = 'Manual stock adjustment';
            break;
          default:
            throw new HttpException('Invalid transaction type', HttpStatus.BAD_REQUEST);
        }

        const newQuantity = product.quantity + quantityChange;
        if (newQuantity < 0) throw new HttpException(`Resulting stock for product ${product.name} cannot be negative`, HttpStatus.BAD_REQUEST);

        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: newQuantity,
            status: newQuantity === 0 ? ProductStatus.SOLD : product.status,
            updatedAt: new Date(),
          },
        });

        await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
            creditMonth: item.creditMonth,
            creditPercent: item.creditPercent,
            monthlyPayment: item.monthlyPayment,
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
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      return transaction;
    });
  }

  async findAll(
    skip: number,
    take: number,
    filters?: { customerId?: number; userId?: number; type?: TransactionType; createdAt?: any },
  ) {
    try {
      return await this.prisma.transaction.findMany({
        skip,
        take,
        where: {
          customerId: filters?.customerId,
          userId: filters?.userId,
          type: filters?.type,
          createdAt: filters?.createdAt,
        },
        include: {
          customer: true,
          user: true,
          items: { include: { product: true } },
          stockHistory: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve transactions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async countTransactions(
    filters?: { customerId?: number; userId?: number; type?: TransactionType; createdAt?: any },
  ) {
    try {
      return await this.prisma.transaction.count({
        where: {
          customerId: filters?.customerId,
          userId: filters?.userId,
          type: filters?.type,
          createdAt: filters?.createdAt,
        },
      });
    } catch (error) {
      throw new HttpException(
        `Failed to count transactions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
    if (!transaction) throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    return transaction;
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      });
      if (!transaction) throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);

      for (const item of transaction.items) {
        const product = item.product;
        if (!product) throw new HttpException(`Product with ID ${item.productId} not found`, HttpStatus.NOT_FOUND);

        let quantityChange = 0;
        let stockHistoryType: StockHistoryType = StockHistoryType.ADJUSTMENT;
        let description: string = 'Reverted transaction';

        switch (transaction.type) {
          case TransactionType.SALE:
          case TransactionType.WRITE_OFF:
            quantityChange = item.quantity;
            stockHistoryType = StockHistoryType.INFLOW;
            description = `Reversed ${transaction.type.toLowerCase()}`;
            break;
          case TransactionType.RETURN:
            quantityChange = -item.quantity;
            stockHistoryType = StockHistoryType.ADJUSTMENT;
            description = 'Reversed return';
            break;
          case TransactionType.TRANSFER:
            quantityChange = -item.quantity;
            stockHistoryType = StockHistoryType.ADJUSTMENT;
            description = 'Reversed transfer';
            break;
          case TransactionType.STOCK_ADJUSTMENT:
            quantityChange = -item.quantity;
            stockHistoryType = StockHistoryType.ADJUSTMENT;
            description = 'Reversed stock adjustment';
            break;
          default:
            throw new HttpException('Invalid transaction type', HttpStatus.BAD_REQUEST);
        }

        const newQuantity = product.quantity + quantityChange;
        if (newQuantity < 0) throw new HttpException(`Resulting stock for product ${product.name} cannot be negative`, HttpStatus.BAD_REQUEST);

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
            type: stockHistoryType,
            description,
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      await tx.transactionItem.deleteMany({ where: { transactionId: id } });

      let total = 0;
      const items = updateTransactionDto.items ?? transaction.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        creditMonth: item.creditMonth,
        creditPercent: item.creditPercent,
        monthlyPayment: item.monthlyPayment,
      }));

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new HttpException(`Product with ID ${item.productId} not found`, HttpStatus.NOT_FOUND);
        if ((updateTransactionDto.type ?? transaction.type) === TransactionType.SALE && product.quantity < item.quantity) {
          throw new HttpException(`Insufficient stock for product ${product.name}`, HttpStatus.BAD_REQUEST);
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
          deliveryMethod: updateTransactionDto.deliveryMethod ?? transaction.deliveryMethod,
          amountPaid: updateTransactionDto.amountPaid ?? transaction.amountPaid,
          remainingBalance: updateTransactionDto.remainingBalance ?? transaction.remainingBalance,
          receiptId: updateTransactionDto.receiptId ?? transaction.receiptId,
          updatedAt: new Date(),
        },
      });

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new HttpException(`Product with ID ${item.productId} not found`, HttpStatus.NOT_FOUND);

        let quantityChange = 0;
        let stockHistoryType: StockHistoryType = StockHistoryType.ADJUSTMENT;
        let description: string = 'Updated transaction';

        const newType = updateTransactionDto.type ?? transaction.type;
        switch (newType) {
          case TransactionType.SALE:
          case TransactionType.WRITE_OFF:
            quantityChange = -item.quantity;
            stockHistoryType = StockHistoryType.OUTFLOW;
            description = newType === TransactionType.SALE ? 'Updated sale' : 'Updated write-off';
            break;
          case TransactionType.RETURN:
            quantityChange = item.quantity;
            stockHistoryType = StockHistoryType.RETURN;
            description = 'Updated return';
            break;
          case TransactionType.TRANSFER:
            quantityChange = item.quantity;
            stockHistoryType = StockHistoryType.INFLOW;
            description = 'Updated transfer';
            break;
          case TransactionType.STOCK_ADJUSTMENT:
            quantityChange = item.quantity;
            stockHistoryType = StockHistoryType.ADJUSTMENT;
            description = 'Updated stock adjustment';
            break;
          default:
            throw new HttpException('Invalid transaction type', HttpStatus.BAD_REQUEST);
        }

        const newQuantity = product.quantity + quantityChange;
        if (newQuantity < 0) throw new HttpException(`Resulting stock for product ${product.name} cannot be negative`, HttpStatus.BAD_REQUEST);

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
            creditMonth: item.creditMonth,
            creditPercent: item.creditPercent,
            monthlyPayment: item.monthlyPayment,
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
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      return updatedTransaction;
    });
  }

  async remove(id: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      });
      if (!transaction) throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);

      for (const item of transaction.items) {
        const product = item.product;
        if (!product) throw new HttpException(`Product with ID ${item.productId} not found`, HttpStatus.NOT_FOUND);

        let quantityChange = 0;
        let stockHistoryType: StockHistoryType = StockHistoryType.ADJUSTMENT;
        let description: string = 'Reverted transaction';

        switch (transaction.type) {
          case TransactionType.SALE:
          case TransactionType.WRITE_OFF:
            quantityChange = item.quantity;
            stockHistoryType = StockHistoryType.INFLOW;
            description = `Reversed ${transaction.type.toLowerCase()}`;
            break;
          case TransactionType.RETURN:
            quantityChange = -item.quantity;
            stockHistoryType = StockHistoryType.ADJUSTMENT;
            description = 'Reversed return';
            break;
          case TransactionType.TRANSFER:
            quantityChange = -item.quantity;
            stockHistoryType = StockHistoryType.ADJUSTMENT;
            description = 'Reversed transfer';
            break;
          case TransactionType.STOCK_ADJUSTMENT:
            quantityChange = -item.quantity;
            stockHistoryType = StockHistoryType.ADJUSTMENT;
            description = 'Reversed stock adjustment';
            break;
          default:
            throw new HttpException('Invalid transaction type', HttpStatus.BAD_REQUEST);
        }

        const newQuantity = product.quantity + quantityChange;
        if (newQuantity < 0) throw new HttpException(`Resulting stock for product ${product.name} cannot be negative`, HttpStatus.BAD_REQUEST);

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
            type: stockHistoryType,
            description,
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      await tx.transactionItem.deleteMany({ where: { transactionId: id } });
      return tx.transaction.delete({ where: { id } });
    });
  }

  async findStockHistory(
    skip: number,
    take: number,
    filters?: { productId?: number; branchId?: number; type?: StockHistoryType; userId?: number },
  ) {
    try {
      return await this.prisma.productStockHistory.findMany({
        skip,
        take,
        where: {
          productId: filters?.productId,
          branchId: filters?.branchId,
          type: filters?.type,
          createdById: filters?.userId,
        },
        include: {
          product: true,
          transaction: { include: { customer: true } },
          createdBy: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new HttpException(`Failed to fetch stock history: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async countStockHistory(
    filters?: { productId?: number; branchId?: number; type?: StockHistoryType; userId?: number },
  ) {
    try {
      return await this.prisma.productStockHistory.count({
        where: {
          productId: filters?.productId,
          branchId: filters?.branchId,
          type: filters?.type,
          createdById: filters?.userId,
        },
      });
    } catch (error) {
      throw new HttpException(`Failed to count stock history: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findStockHistoryById(id: number) {
    try {
      const stockHistory = await this.prisma.productStockHistory.findUnique({
        where: { id },
        include: {
          product: true,
          transaction: { include: { customer: true } },
          createdBy: true,
        },
      });
      if (!stockHistory) {
        throw new HttpException('Stock history not found', HttpStatus.NOT_FOUND);
      }
      return stockHistory;
    } catch (error) {
      throw new HttpException(`Failed to fetch stock history: ${error.message}`, HttpStatus.NOT_FOUND);
    }
  }
}