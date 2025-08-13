import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction, TransactionStatus, PaymentType } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    return this.prisma.$transaction(async (prisma) => {
      const { customer, branchId, items, type, userId, paymentType, status = 'PENDING', total: dtoTotal, finalTotal: dtoFinalTotal } = createTransactionDto;

      // Validate branch
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) throw new BadRequestException('Invalid branch ID');

      // Validate user
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new BadRequestException('Invalid user ID');

      // Validate products and stock
      for (const item of items) {
        const product = await prisma.product.findFirst({
          where: { id: item.productId, branchId },
        });
        if (!product) {
          throw new BadRequestException(`Product ID ${item.productId} not found in branch ${branchId}`);
        }
        if (item.quantity <= 0) {
          throw new BadRequestException(`Quantity for product ${item.productId} must be positive`);
        }
        if (product.quantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name || `Product ${item.productId}`}: available ${product.quantity}, requested ${item.quantity}`,
          );
        }
      }

      // Calculate totals
      const calculatedTotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
      if (Math.abs(calculatedTotal - dtoTotal) > 0.01) {
        throw new BadRequestException(`Calculated total (${calculatedTotal.toFixed(2)}) does not match provided total (${dtoTotal})`);
      }

      let interestRate = 0;
      let creditMonth: number | undefined;
      if (paymentType && ['CREDIT', 'INSTALLMENT'].includes(paymentType)) {
        creditMonth = items[0]?.creditMonth;
        if (!creditMonth || items.some((item) => item.creditMonth !== creditMonth)) {
          throw new BadRequestException('All items must have the same credit month');
        }
        if (creditMonth <= 0 || creditMonth > 24) {
          throw new BadRequestException('Credit months must be between 1 and 24');
        }
        interestRate = creditMonth <= 3 ? 0.05 : creditMonth <= 6 ? 0.10 : creditMonth <= 12 ? 0.15 : 0.20;
        const expectedFinalTotal = calculatedTotal * (1 + interestRate);
        if (Math.abs(expectedFinalTotal - dtoFinalTotal) > 0.01) {
          throw new BadRequestException(
            `Final total (${dtoFinalTotal.toFixed(2)}) does not match calculated total with interest (${expectedFinalTotal.toFixed(2)})`,
          );
        }
      } else if (Math.abs(dtoTotal - dtoFinalTotal) > 0.01) {
        throw new BadRequestException('Final total must match total when no payment type is specified');
      }

      // Create or find customer
      let customerId: number | undefined;
      if (customer) {
        const existingCustomer = await prisma.customer.findFirst({
          where: { phone: customer.phone },
        });
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const newCustomer = await prisma.customer.create({
            data: {
              firstName: customer.firstName,
              lastName: customer.lastName,
              phone: customer.phone,
              email: customer.email,
              address: customer.address,
            },
          });
          customerId = newCustomer.id;
        }
      }

      // Create transaction with items
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          branchId,
          type,
          status,
          total: dtoTotal,
          finalTotal: dtoFinalTotal,
          paymentType,
          customerId,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              total: item.quantity * item.price,
              creditMonth: item.creditMonth,
              creditPercent: paymentType ? interestRate : undefined,
              monthlyPayment: paymentType && creditMonth ? dtoFinalTotal / creditMonth : undefined,
            })),
          },
        },
        include: {
          items: true,
          customer: true,
          branch: true,
          user: true,
        },
      });

      // Update product quantities atomically
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      return transaction;
    });
  }

  async findAll(branchId?: number): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: branchId ? { branchId } : {},
      include: {
        items: true,
        customer: true,
        branch: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        items: true,
        customer: true,
        branch: true,
        user: true,
      },
    });
    if (!transaction) throw new NotFoundException(`Transaction with ID ${id} not found`);
    return transaction;
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!transaction) throw new NotFoundException(`Transaction with ID ${id} not found`);

    if (updateTransactionDto.status === 'CANCELLED' && transaction.status !== 'CANCELLED') {
      await this.prisma.$transaction(async (prisma) => {
        for (const item of transaction.items) {
          await prisma.product.update({
            where: { id: id },
            data: { quantity: { increment: item.quantity } },
          });
        }
      });
    }

    return this.prisma.transaction.update({
      where: { id },
      data: updateTransactionDto,
      include: {
        items: true,
        customer: true,
        branch: true,
        user: true,
      },
    });
  }

  async remove(id: number): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException(`Transaction with ID ${id} not found`);
    await this.prisma.transaction.delete({ where: { id } });
  }
}