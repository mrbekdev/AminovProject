import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction, TransactionStatus, PaymentType, TransactionType, Product } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    return this.prisma.$transaction(async (prisma) => {
      const {
        customer,
        branchId,
        toBranchId,
        items,
        type,
        userId,
        paymentType,
        status = TransactionStatus.PENDING,
        total: dtoTotal,
        finalTotal: dtoFinalTotal,
      } = createTransactionDto;

      // Validate user
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new BadRequestException('Invalid user ID');

      // Common validations
      if (!items || items.length === 0) throw new BadRequestException('Items are required');

      let interestRate = 0;
      let creditMonth: number | undefined;

      if (type === TransactionType.TRANSFER) {
        if (!toBranchId) throw new BadRequestException('toBranchId is required for TRANSFER');
        if (toBranchId === branchId) throw new BadRequestException('Cannot transfer to the same branch');
        if (customer) throw new BadRequestException('No customer for TRANSFER');
        if (paymentType) throw new BadRequestException('No paymentType for TRANSFER');
        if (Math.abs(dtoTotal - dtoFinalTotal) > 0.01) throw new BadRequestException('Final total must match total for TRANSFER');

        // Validate from branch
        const branch = await prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch) throw new BadRequestException('Invalid branch ID');

        // Validate to branch
        const toBranch = await prisma.branch.findUnique({ where: { id: toBranchId } });
        if (!toBranch) throw new BadRequestException('Invalid toBranch ID');
      } else {
        if (toBranchId) throw new BadRequestException('toBranchId not allowed for non-TRANSFER');
        // Validate branch (for non-TRANSFER)
        const branch = await prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch) throw new BadRequestException('Invalid branch ID');

        if (paymentType && [PaymentType.CREDIT, PaymentType.INSTALLMENT].includes('CREDIT')) {
          creditMonth = items[0]?.creditMonth;
          if (!creditMonth || items.some((item) => item.creditMonth !== creditMonth)) {
            throw new BadRequestException('All items must have the same credit month');
          }
          if (creditMonth <= 0 || creditMonth > 24) {
            throw new BadRequestException('Credit months must be between 1 and 24');
          }
          interestRate = creditMonth <= 3 ? 0.05 : creditMonth <= 6 ? 0.10 : creditMonth <= 12 ? 0.15 : 0.20;
          const expectedFinalTotal = dtoTotal * (1 + interestRate);
          if (Math.abs(expectedFinalTotal - dtoFinalTotal) > 0.01) {
            throw new BadRequestException(
              `Final total (${dtoFinalTotal.toFixed(2)}) does not match calculated total with interest (${expectedFinalTotal.toFixed(2)})`,
            );
          }
        } else if (Math.abs(dtoTotal - dtoFinalTotal) > 0.01) {
          throw new BadRequestException('Final total must match total when no credit payment type is specified');
        }
      }

      // Validate products and stock
      const products: Product[] = [];
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
        if (Math.abs(item.price - product.price) > 0.01) {
          throw new BadRequestException(`Price for product ${item.productId} must match product price (${product.price})`);
        }
        products.push(product);
      }

      // Calculate totals
      const calculatedTotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
      if (Math.abs(calculatedTotal - dtoTotal) > 0.01) {
        throw new BadRequestException(`Calculated total (${calculatedTotal.toFixed(2)}) does not match provided total (${dtoTotal})`);
      }

      // Create or find customer (only for non-TRANSFER)
      let customerId: number | undefined;
      if (type !== TransactionType.TRANSFER && customer) {
        const existingCustomer = await prisma.customer.findFirst({ where: { phone: customer.phone } });
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
          toBranchId: type === TransactionType.TRANSFER ? toBranchId : undefined,
          type: type as TransactionType,
          status: status as TransactionStatus,
          total: dtoTotal,
          finalTotal: dtoFinalTotal,
          paymentType: type === TransactionType.TRANSFER ? undefined : paymentType as PaymentType | undefined,
          customerId,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              total: item.quantity * item.price,
              creditMonth: creditMonth,
              creditPercent: interestRate > 0 ? interestRate : undefined,
              monthlyPayment: interestRate > 0 && creditMonth ? dtoFinalTotal / creditMonth : undefined,
            })),
          },
        },
        include: {
          items: true,
          customer: true,
          branch: true,
          toBranch: true,
          user: true,
        },
      });

      // Update product quantities
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const product = products[i];

        // Decrement from source branch
        await prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });

        if (type === TransactionType.TRANSFER) {
          // Find or create product in toBranch
          let toProduct = await prisma.product.findFirst({
            where: { barcode: product.barcode ?? null, branchId: toBranchId! },
          });
          if (!toProduct) {
            toProduct = await prisma.product.create({
              data: {
                name: product.name,
                barcode: product.barcode ?? null,
                model: product.model ?? null,
                price: product.price,
                quantity: 0,
                defectiveQuantity: 0,
                initialQuantity: 0,
                status: 'IN_STORE',
                branchId: toBranchId!,
                categoryId: product.categoryId,
                marketPrice: product.marketPrice ?? null,
              },
            });
          }
          // Increment in destination branch
          await prisma.product.update({
            where: { id: toProduct.id },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }

      return transaction;
    });
  }

  async findAll(branchId?: number): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: branchId ? { OR: [{ branchId }, { toBranchId: branchId }] } : {},
      include: {
        items: true,
        customer: true,
        branch: true,
        toBranch: true,
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
        toBranch: true,
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

    if (updateTransactionDto.status === TransactionStatus.CANCELLED && transaction.status !== TransactionStatus.CANCELLED) {
      await this.prisma.$transaction(async (prisma) => {
        for (const item of transaction.items) {
          if (!item.productId) continue;
          const product = await prisma.product.findUnique({ where: { id: item.productId } });
          if (!product) continue;

          if (transaction.type === TransactionType.TRANSFER) {
            await prisma.product.update({
              where: { id: item.productId },
              data: { quantity: { increment: item.quantity } },
            });
            const toProduct = await prisma.product.findFirst({
              where: { barcode: product?.barcode ?? null, branchId: transaction.toBranchId ?? undefined },
            });
            if (toProduct) {
              await prisma.product.update({
                where: { id: toProduct.id },
                data: { quantity: { decrement: item.quantity } },
              });
            }
          } else {
            await prisma.product.update({
              where: { id: item.productId },
              data: { quantity: { increment: item.quantity } },
            });
          }
        }
      });
    }

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...updateTransactionDto,
        status: updateTransactionDto.status as TransactionStatus | undefined,
        paymentType: updateTransactionDto.paymentType as PaymentType | undefined,
      },
      include: {
        items: true,
        customer: true,
        branch: true,
        toBranch: true,
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