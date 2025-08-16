import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionType, TransactionStatus, PaymentType } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto, userId?: number) {
    const { items, customer, ...transactionData } = createTransactionDto;

    // User role ni tekshirish - faqat MARKETING roli bilan userlar sotish qilishi mumkin
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw new BadRequestException('User topilmadi');
      }
      
      if (user.role !== 'MARKETING') {
        throw new BadRequestException('Sotish qilish uchun MARKETING roli kerak');
      }
    }

    // Customer yaratish yoki mavjudini topish
    let customerId: number | null = null;
    if (customer) {
      const existingCustomer = await this.prisma.customer.findFirst({
        where: { phone: customer.phone }
      });
      
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const newCustomer = await this.prisma.customer.create({
          data: customer
        });
        customerId = newCustomer.id;
      }
    }

    // Transaction yaratish
    const transaction = await this.prisma.transaction.create({
      data: {
        ...transactionData,
        customerId,
        userId, // Kim sotganini saqlaymiz
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
            creditMonth: item.creditMonth,
            creditPercent: item.creditPercent,
            monthlyPayment: item.monthlyPayment || this.calculateMonthlyPayment(item)
          }))
        }
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        paymentSchedules: true
      }
    });

    // Kredit bo'lsa, oylik to'lovlar jadvalini yaratish
    if (transaction.paymentType === PaymentType.CREDIT || transaction.paymentType === PaymentType.INSTALLMENT) {
      await this.createPaymentSchedule(transaction.id, transaction.items, createTransactionDto.downPayment || 0);
    }

    // Mahsulot miqdorlarini yangilash
    await this.updateProductQuantities(transaction);

    return transaction;
  }

  private calculateMonthlyPayment(item: any): number {
    if (!item.creditMonth || !item.creditPercent) return 0;
    
    const totalWithInterest = item.price * item.quantity * (1 + item.creditPercent / 100);
    return totalWithInterest / item.creditMonth;
  }

  private async createPaymentSchedule(transactionId: number, items: any[], downPayment: number = 0) {
    const schedules: any[] = [];
    
    // Bitta transaction uchun bitta payment schedule yaratamiz
    // Barcha itemlarni birlashtirib umumiy summani hisoblaymiz
    let totalWithInterest = 0;
    let totalMonths = 0;
    
    for (const item of items) {
      if (item.creditMonth && item.creditPercent) {
        const itemTotal = item.price * item.quantity * (1 + item.creditPercent / 100);
        totalWithInterest += itemTotal;
        totalMonths = Math.max(totalMonths, item.creditMonth);
      }
    }
    
    if (totalWithInterest > 0 && totalMonths > 0) {
      const remainingAfterDownPayment = totalWithInterest - downPayment;
      const monthlyPayment = remainingAfterDownPayment / totalMonths;
      let remainingBalance = remainingAfterDownPayment;

      for (let month = 1; month <= totalMonths; month++) {
        remainingBalance -= monthlyPayment;
        schedules.push({
          transactionId,
          month,
          payment: monthlyPayment,
          remainingBalance: Math.max(0, remainingBalance),
          isPaid: false,
          paidAmount: 0
        });
      }
    }

    if (schedules.length > 0) {
      await this.prisma.paymentSchedule.createMany({
        data: schedules
      });
    }
  }

  private async updateProductQuantities(transaction: any) {
    for (const item of transaction.items) {
      if (item.productId) {
        // Mahsulotni fromBranchId orqali topish
        const product = await this.prisma.product.findFirst({
          where: { 
            id: item.productId,
            branchId: transaction.fromBranchId 
          }
        });

        if (!product) continue;

        let newQuantity = product.quantity;
        let newStatus = product.status;

        if (transaction.type === 'SALE') {
          // Sotish - mahsulot sonidan kamaytirish
          newQuantity = Math.max(0, product.quantity - item.quantity);
          newStatus = newQuantity === 0 ? 'SOLD' : 'IN_STORE';
        } else if (transaction.type === 'PURCHASE') {
          // Kirim - mahsulot soniga qo'shish
          newQuantity = product.quantity + item.quantity;
          newStatus = 'IN_WAREHOUSE';
        } else if (transaction.type === 'TRANSFER') {
          // O'tkazma - faqat manba filialdan kamaytirish
          // Maqsad filialga qo'shish approveTransfer da amalga oshiriladi
          newQuantity = Math.max(0, product.quantity - item.quantity);
          newStatus = newQuantity === 0 ? 'SOLD' : 'IN_STORE';
        }

        await this.prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: newQuantity,
            status: newStatus
          }
        });
      }
    }
  }

  async findAll(query: any = {}) {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      branchId,
      customerId,
      startDate,
      endDate,
      paymentType
    } = query;

    console.log('=== BACKEND DEBUG ===');
    console.log('Query params:', query);
    console.log('BranchId:', branchId);

    const where: any = {};
    
    if (type) where.type = type;
    if (status) where.status = status;
    if (branchId) {
      // BranchId orqali filtrlash - bu filialdan chiqgan yoki kirgan transactionlarni olish
      where.OR = [
        { fromBranchId: parseInt(branchId) },
        { toBranchId: parseInt(branchId) }
      ];
      console.log('Where clause:', where);
    }
    if (customerId) where.customerId = parseInt(customerId);
    if (paymentType) where.paymentType = paymentType;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: parseInt(limit),
      include: {
          customer: true,
          user: true,
          fromBranch: true,
          toBranch: true,
        items: {
          include: {
              product: true
            }
          },
          paymentSchedules: {
            orderBy: { month: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.transaction.count({ where })
    ]);

    return {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        user: true,
        fromBranch: true,
        toBranch: true,
        items: {
          include: {
            product: true
          }
        },
        paymentSchedules: {
          orderBy: { month: 'asc' }
        }
      }
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto) {
    const transaction = await this.findOne(id);
    
    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException('Completed transactions cannot be modified');
    }

    return this.prisma.transaction.update({
      where: { id },
      data: updateTransactionDto,
      include: {
        customer: true,
        user: true,
        fromBranch: true,
        toBranch: true,
        items: {
          include: {
            product: true
          }
        },
        paymentSchedules: {
          orderBy: { month: 'asc' }
        }
      }
    });
  }

  async remove(id: number) {
    const transaction = await this.findOne(id);
    
    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException('Completed transactions cannot be deleted');
    }

    // Mahsulot miqdorlarini qaytarish
        for (const item of transaction.items) {
      if (item.productId) {
        await this.prisma.product.update({
              where: { id: item.productId },
          data: {
            quantity: {
              increment: item.quantity
            }
          }
        });
      }
    }

    return this.prisma.transaction.delete({
      where: { id }
    });
  }

  // Kredit to'lovlarini boshqarish
  async getPaymentSchedules(transactionId: number) {
    const transaction = await this.findOne(transactionId);
    return transaction.paymentSchedules;
  }

  async updatePaymentStatus(transactionId: number, month: number, paid: boolean) {
    const schedule = await this.prisma.paymentSchedule.findFirst({
      where: { transactionId, month }
    });

    if (!schedule) {
      throw new NotFoundException('Payment schedule not found');
    }

    // PaymentSchedule modelida paid field yo'q, shuning uchun boshqa yechim ishlatamiz
    return this.prisma.paymentSchedule.update({
      where: { id: schedule.id },
      data: { 
        // paid field yo'q, shuning uchun boshqa field bilan belgilaymiz
        remainingBalance: paid ? 0 : schedule.remainingBalance
        }
      });
    }

  // Filiallar orasida o'tkazma
  async createTransfer(transferData: any) {
    const { fromBranchId, toBranchId, items, ...data } = transferData;

    // Umumiy summani hisoblash
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // O'tkazma yaratish
    const transfer = await this.prisma.transaction.create({
      data: {
        ...data,
        type: TransactionType.TRANSFER,
              fromBranchId: fromBranchId,
      toBranchId: toBranchId,
        status: TransactionStatus.PENDING,
        total: total,
        finalTotal: total, // Transfer uchun total va finalTotal bir xil
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
          }))
        }
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        paymentSchedules: true
      }
    });

    // Mahsulot miqdorlarini yangilash - manba filialdan kamaytirish
    await this.updateProductQuantities(transfer);

    return transfer;
  }

  async approveTransfer(id: number, approvedById: number) {
    const transaction = await this.findOne(id);
    
    if (transaction.type !== TransactionType.TRANSFER) {
      throw new BadRequestException('Only transfer transactions can be approved');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Transaction is not pending');
    }

    // Mahsulotlarni o'tkazish
    for (const item of transaction.items) {
      if (item.productId && item.product) {
        // Manba filialdan chiqarish - bu allaqachon createTransfer da amalga oshirilgan
        // Faqat maqsad filialga qo'shish qilamiz
        
        // Maqsad filialda mavjud mahsulotni topish
        const targetProduct = await this.prisma.product.findFirst({
          where: {
            barcode: item.product.barcode,
            branchId: transaction.toBranchId || 0
          }
        });

        if (targetProduct) {
          // Mavjud mahsulotga qo'shish
          await this.prisma.product.update({
            where: { id: targetProduct.id },
            data: {
              quantity: {
                increment: item.quantity
              },
              status: 'IN_WAREHOUSE'
            }
          });
        } else {
          // Yangi mahsulot yaratish
          await this.prisma.product.create({
            data: {
              name: item.product.name,
              barcode: item.product.barcode,
              model: item.product.model,
              price: item.product.price,
              quantity: item.quantity,
              status: 'IN_WAREHOUSE',
              branchId: transaction.toBranchId || 0,
              categoryId: item.product.categoryId,
              marketPrice: item.product.marketPrice
            }
          });
        }
      }
    }

    // O'tkazmani tasdiqlash
    return this.prisma.transaction.update({
      where: { id },
      data: {
        status: TransactionStatus.COMPLETED,
        userId: approvedById
      }
    });
  }

  async rejectTransfer(id: number) {
    const transaction = await this.findOne(id);
    
    if (transaction.type !== TransactionType.TRANSFER) {
      throw new BadRequestException('Only transfer transactions can be rejected');
    }

    return this.prisma.transaction.update({
      where: { id },
      data: { status: TransactionStatus.CANCELLED }
    });
  }

  // Statistika
  async getStatistics(branchId?: number, startDate?: string, endDate?: string) {
    const where: any = {};
    const whereOr: any = [];
    
    if (branchId) {
      whereOr.push({ fromBranchId: branchId });
      whereOr.push({ toBranchId: branchId });
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Agar branchId berilgan bo'lsa, OR shartini qo'shamiz
    if (whereOr.length > 0) {
      where.OR = whereOr;
    }

    const [totalSales, creditSales, cashSales, cardSales, purchases, transfers] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.SALE },
        _sum: { finalTotal: true },
        _count: true
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.SALE, paymentType: PaymentType.CREDIT },
        _sum: { finalTotal: true },
        _count: true
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.SALE, paymentType: PaymentType.CASH },
        _sum: { finalTotal: true },
        _count: true
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.SALE, paymentType: PaymentType.CARD },
        _sum: { finalTotal: true },
        _count: true
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.PURCHASE },
        _sum: { finalTotal: true },
        _count: true
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.TRANSFER },
        _sum: { finalTotal: true },
        _count: true
      })
    ]);

    return {
      totalSales: totalSales._sum.finalTotal || 0,
      totalTransactions: totalSales._count || 0,
      creditSales: creditSales._sum.finalTotal || 0,
      creditTransactions: creditSales._count || 0,
      cashSales: cashSales._sum.finalTotal || 0,
      cashTransactions: cashSales._count || 0,
      cardSales: cardSales._sum.finalTotal || 0,
      cardTransactions: cardSales._count || 0,
      totalPurchases: purchases._sum.finalTotal || 0,
      purchaseTransactions: purchases._count || 0,
      totalTransfers: transfers._sum.finalTotal || 0,
      transferTransactions: transfers._count || 0
    };
}
}