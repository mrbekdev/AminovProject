import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto, CreateTransactionItemDto } from './dto/create-transaction.dto';
import { Transaction } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    return this.prisma.$transaction(async (prisma) => {
      // Validate user
      const user = await prisma.user.findUnique({ where: { id: createTransactionDto.userId } });
      if (!user) throw new BadRequestException('Invalid user ID');

      // Validate branch
      const branch = await prisma.branch.findUnique({ where: { id: createTransactionDto.branchId } });
      if (!branch) throw new BadRequestException('Invalid branch ID');

      // Handle customer
      let customerId = createTransactionDto.customerId;
      if (createTransactionDto.customer && !customerId) {
        const { firstName, lastName, phone } = createTransactionDto.customer;
        if (!firstName || !lastName || !phone) {
          throw new BadRequestException('Customer details (firstName, lastName, phone) are required');
        }
        let customer = await prisma.customer.findFirst({ where: { phone } });
        if (!customer) {
          customer = await prisma.customer.create({ data: { firstName, lastName, phone } });
        }
        customerId = customer.id;
      }
      if (customerId) {
        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) throw new BadRequestException('Invalid customer ID');
      }

      // Validate products and stock
      for (const item of createTransactionDto.items) {
        const product = await prisma.product.findFirst({
          where: { id: item.productId, branchId: createTransactionDto.branchId },
        });
        if (!product) throw new BadRequestException(`Product ID ${item.productId} not found in branch ${createTransactionDto.branchId}`);

        if (['SALE', 'WRITE_OFF'].includes(createTransactionDto.type)) {
          if (item.quantity <= 0) throw new BadRequestException(`Quantity must be positive for ${createTransactionDto.type}`);
          if (product.quantity < item.quantity) {
            throw new BadRequestException(`Insufficient stock for ${product.name}: available ${product.quantity}, requested ${item.quantity}`);
          }
        } else if (['PURCHASE', 'RETURN'].includes(createTransactionDto.type)) {
          if (item.quantity <= 0) throw new BadRequestException(`Quantity must be positive for ${createTransactionDto.type}`);
        } else if (createTransactionDto.type === 'STOCK_ADJUSTMENT') {
          // Allow positive or negative for adjustments, but check final quantity >= 0
          const newQuantity = product.quantity + item.quantity;
          if (newQuantity < 0) throw new BadRequestException(`Adjustment would reduce stock below 0 for ${product.name}`);
        } else if (createTransactionDto.type === 'TRANSFER') {
          throw new BadRequestException('Transfers should be handled via ProductTransfer endpoint');
        }
      }

      // Calculate totals
      const total = createTransactionDto.items.reduce((sum, item) => sum + item.total, 0);
      const finalTotal = total - (createTransactionDto.discount || 0);

      // Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          customerId,
          userId: createTransactionDto.userId,
          branchId: createTransactionDto.branchId,
          type: createTransactionDto.type,
          status: createTransactionDto.status || 'PENDING',
          discount: createTransactionDto.discount || 0,
          total,
          finalTotal,
          paymentType: createTransactionDto.type === 'SALE' ? createTransactionDto.paymentType : undefined,
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
          user: true,
          customer: true,
          branch: true,
        },
      });

      // Update product quantities
      for (const item of createTransactionDto.items) {
        const product = await prisma.product.findFirst({
          where: { id: item.productId, branchId: createTransactionDto.branchId },
        });
        if (!product) throw new BadRequestException(`Product not found: ${item.productId}`);

        let newQuantity = product.quantity;

        switch (createTransactionDto.type) {
          case 'SALE':
            newQuantity -= item.quantity;
            break;
          case 'PURCHASE':
            newQuantity += item.quantity;
            break;
          case 'RETURN':
            newQuantity += item.quantity;
            break;
          case 'WRITE_OFF':
            newQuantity -= item.quantity;
            break;
          case 'STOCK_ADJUSTMENT':
            newQuantity += item.quantity;
            break;
          default:
            continue; // Skip stock update for other types like TRANSFER
        }

        if (newQuantity < 0) throw new BadRequestException(`Cannot reduce stock below 0 for ${product.name}`);

        await prisma.product.update({
          where: { id: item.productId },
          data: { quantity: newQuantity },
        });

        console.log(`${createTransactionDto.type}: Product ${item.productId}, Old Qty: ${product.quantity}, New Qty: ${newQuantity}`);
      }

      return transaction;
    });
  }

  async findAll(branchId?: number): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: branchId && !isNaN(branchId) && Number.isInteger(branchId) && branchId > 0 ? { branchId } : {},
      include: {
        customer: true,
        user: true,

        branch: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        user: true,

        branch: true,
      },
    });
    if (!transaction) throw new NotFoundException(`Transaction with ID ${id} not found`);
    return transaction;
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException(`Transaction with ID ${id} not found`);
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

        branch: true,
      },
    });
  }

  async remove(id: number): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException(`Transaction with ID ${id} not found`);
    await this.prisma.$transaction(async (prisma) => {
      await prisma.transactionItem.deleteMany({ where: { transactionId: id } });

      await prisma.transaction.delete({ where: { id } });
    });
  }
}