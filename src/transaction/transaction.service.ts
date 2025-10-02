import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionType, TransactionStatus, PaymentType } from '@prisma/client';
import { CurrencyExchangeRateService } from '../currency-exchange-rate/currency-exchange-rate.service';
import { BonusService } from '../bonus/bonus.service';

@Injectable()
export class TransactionService {
  constructor(
    private prisma: PrismaService,
    private currencyExchangeRateService: CurrencyExchangeRateService,
    private bonusService: BonusService,
  ) {}

  async create(createTransactionDto: CreateTransactionDto, userId?: number) {
    const { items, customer, ...transactionData } = createTransactionDto;

    // User role ni tekshirish - endi frontend da tanlanadi
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw new BadRequestException('User topilmadi');
      }
    }

    // Customer yaratish yoki mavjudini yangilash (passportSeries va jshshir-ni ham saqlash)
    let customerId: number | null = null;
    if (customer) {
      const existingCustomer = await this.prisma.customer.findFirst({
        where: { phone: customer.phone }
      });
      
      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Agar yangi ma'lumotlar kelgan bo'lsa, ularni yangilaymiz
        const updateData: any = {};
        if (customer.fullName && customer.fullName !== existingCustomer.fullName) {
          updateData.fullName = customer.fullName;
        }
        if (customer.passportSeries && customer.passportSeries !== existingCustomer.passportSeries) {
          updateData.passportSeries = customer.passportSeries;
        }
        if (customer.jshshir && customer.jshshir !== existingCustomer.jshshir) {
          updateData.jshshir = customer.jshshir;
        }
        if (typeof customer.address === 'string' && customer.address !== existingCustomer.address) {
          updateData.address = customer.address;
        }
        if (Object.keys(updateData).length > 0) {
          await this.prisma.customer.update({
            where: { id: existingCustomer.id },
            data: updateData
          });
        }
      } else {
        const newCustomer = await this.prisma.customer.create({
          data: {
            fullName: customer.fullName ? customer.fullName : '',
            phone: customer.phone ? customer.phone : '',
            passportSeries: customer.passportSeries || null,
            jshshir: customer.jshshir || null,
            address: customer.address || null,
          }
        });
        customerId = newCustomer.id;
      }
    }

    // Validate upfrontPaymentType
    const upfrontPaymentType = (transactionData as any).upfrontPaymentType;
    if (upfrontPaymentType && !['CASH', 'CARD'].includes(upfrontPaymentType)) {
      throw new BadRequestException('Invalid upfrontPaymentType. Must be CASH or CARD');
    }

    // Resolve created-by and sold-by users
    const createdByUserId = userId ?? transactionData.userId ?? null;
    const soldByUserId = (transactionData as any).soldByUserId ?? userId ?? createdByUserId ?? null;

    // Compute totals and interest ONCE at sale time to avoid monthly reapplication
    let computedTotal = 0;
    let weightedPercentSum = 0;
    let percentWeightBase = 0;
    for (const item of items) {
      const principal = (item.price || 0) * (item.quantity || 0);
      computedTotal += principal;
      if (item.creditPercent) {
        weightedPercentSum += principal * (item.creditPercent || 0);
        percentWeightBase += principal;
      }
    }
    const upfrontPayment = Number((transactionData as any).downPayment || (transactionData as any).amountPaid || 0) || 0;
    const remainingPrincipal = Math.max(0, computedTotal - upfrontPayment);
    const effectivePercent = percentWeightBase > 0 ? (weightedPercentSum / percentWeightBase) : 0;
    const interestAmount = (transactionData as any).paymentType === PaymentType.CREDIT || (transactionData as any).paymentType === PaymentType.INSTALLMENT
      ? remainingPrincipal * effectivePercent
      : 0;
    const remainingWithInterest = remainingPrincipal + interestAmount;
    const finalTotalOnce = upfrontPayment + remainingWithInterest;

    // Transaction yaratish
    const { cashierId, ...cleanTransactionData } = transactionData as any;
    const transaction = await this.prisma.transaction.create({
      data: {
        ...cleanTransactionData,
        customerId,
        userId: createdByUserId || null, // yaratgan foydalanuvchi
        soldByUserId: soldByUserId || null, // sotgan kassir
        upfrontPaymentType: (transactionData as any).upfrontPaymentType || 'CASH', // Default to CASH if not specified
        termUnit: (transactionData as any).termUnit || 'MONTHS', // Default to MONTHS if not specified
        // Ensure totals are consistent and interest is applied once at sale time
        total: computedTotal,
        finalTotal: finalTotalOnce,
        remainingBalance: remainingWithInterest,
        // Kunlik bo'lib to'lash uchun qo'shimcha ma'lumotlar
        ...((transactionData as any).termUnit === 'DAYS' ? {
          days: (transactionData as any).days || 0,
          months: 0 // Kunlik bo'lib to'lashda oylar 0
        } : {
          months: (transactionData as any).months || 0,
          days: 0 // Oylik bo'lib to'lashda kunlar 0
        }),
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            sellingPrice: item.sellingPrice || item.price, // Use selling price if provided, otherwise use price
            originalPrice: item.originalPrice || item.price, // Use original price if provided, otherwise use price
            total: item.total || (item.price * item.quantity), // Use provided total or calculate
            creditMonth: item.creditMonth,
            creditPercent: item.creditPercent,
            monthlyPayment: item.monthlyPayment || this.calculateMonthlyPayment(item)
          }))
        }
      },
      include: {
        customer: true,
        user: true,
        soldBy: true,
        items: {
          include: {
            product: true
          }
        },
        paymentSchedules: true
      }
    });

    // Kredit yoki Bo'lib to'lash bo'lsa, to'lovlar jadvalini yaratish
    if (transaction.paymentType === PaymentType.CREDIT || transaction.paymentType === PaymentType.INSTALLMENT) {
      // Kunlik yoki oylik to'lovlarni tekshirish
      const isDays = (transaction as any).termUnit === 'DAYS';
      if (isDays) {
        // Kunlik bo'lib to'lash uchun 1 ta payment schedule
        await this.createDailyPaymentSchedule(transaction.id, transaction.items, createTransactionDto.downPayment || 0);
      } else {
        // Oylik bo'lib to'lash uchun har oy uchun alohida schedule
        await this.createPaymentSchedule(transaction.id, transaction.items, createTransactionDto.downPayment || 0);
      }
    }

    // Mahsulot miqdorlarini yangilash
    await this.updateProductQuantities(transaction);

    // Avtomatik bonus hisoblash va yaratish (faqat mijozga sotish uchun)
    // MUHIM: Bonus products avval qo'shilishi kerak, keyin bonus hisoblash
    if (soldByUserId && transactionData.type === TransactionType.SALE) {
      const cashierId = (transactionData as any).cashierId || userId;
      
      // Bonus hisoblashni 2 soniya kechiktirish - bonus products qo'shilishini kutish uchun
      setTimeout(async () => {
        try {
          await this.calculateAndCreateSalesBonuses(transaction, soldByUserId, cashierId);
        } catch (error) {
          console.error('Delayed bonus calculation error:', error);
        }
      }, 2000);
    }

    return transaction;
  }

  private calculateMonthlyPayment(item: any): number {
    if (!item.creditMonth || !item.creditPercent) return 0;
    
    const totalWithInterest = item.price * item.quantity * (1 + item.creditPercent);
    return totalWithInterest / item.creditMonth;
  }

  private async createDailyPaymentSchedule(transactionId: number, items: any[], downPayment: number = 0) {
    const schedules: any[] = [];

    // Aggregate principal and determine weighted interest and days
    let totalPrincipal = 0;
    let weightedPercentSum = 0;
    let percentWeightBase = 0;
    let totalDays = 0;

    for (const item of items) {
      const principal = (item.price || 0) * (item.quantity || 0);
      totalPrincipal += principal;
      if (item.creditPercent) {
        weightedPercentSum += principal * (item.creditPercent || 0);
        percentWeightBase += principal;
      }
      if (item.creditMonth) { // creditMonth field kunlar sonini saqlaydi
        totalDays = Math.max(totalDays, item.creditMonth || 0);
      }
    }

    if (totalPrincipal > 0 && totalDays > 0) {
      // To'g'ri hisoblash: oldindan to'lovni ayirib, keyin foiz qo'shish
      const upfrontPayment = downPayment || 0;
      const remainingPrincipal = Math.max(0, totalPrincipal - upfrontPayment);
      const effectivePercent = percentWeightBase > 0 ? (weightedPercentSum / percentWeightBase) : 0;
      
      console.log('=== BACKEND DEBUG (DAILY) ===');
      console.log('totalPrincipal:', totalPrincipal);
      console.log('upfrontPayment:', upfrontPayment);
      console.log('remainingPrincipal:', remainingPrincipal);
      console.log('weightedPercentSum:', weightedPercentSum);
      console.log('percentWeightBase:', percentWeightBase);
      console.log('effectivePercent:', effectivePercent);
      
      const interestAmount = remainingPrincipal * effectivePercent;
      const remainingWithInterest = remainingPrincipal + interestAmount;
      
      console.log('interestAmount:', interestAmount);
      console.log('remainingWithInterest:', remainingWithInterest);
      console.log('totalDays:', totalDays);

      // Kunlik bo'lib to'lash uchun faqat 1 ta payment schedule yaratish
      // Mijoz bu kunlar ichida qolgan summani to'lab ketishi kerak
      schedules.push({
        transactionId,
        month: 1, // Faqat 1 ta entry
        payment: remainingWithInterest, // To'liq qolgan summa
        remainingBalance: remainingWithInterest, // Kunlik bo'lib to'lashda qolgan summa to'liq bo'lishi kerak
        isPaid: false,
        paidAmount: 0,
        dueDate: new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000), // Kunlar soni keyin to'lov muddati
        isDailyInstallment: true, // Bu kunlik bo'lib to'lash ekanligini belgilash
        daysCount: totalDays, // Kunlar sonini saqlash
        // Kunlik bo'lib to'lash uchun qo'shimcha ma'lumotlar
        installmentType: 'DAILY', // Kunlik bo'lib to'lash turi
        totalDays: totalDays, // Jami kunlar soni
        remainingDays: totalDays // Qolgan kunlar soni
      });
    }

    if (schedules.length > 0) {
      await this.prisma.paymentSchedule.createMany({
        data: schedules
      });
    }
  }

  private async createPaymentSchedule(transactionId: number, items: any[], downPayment: number = 0) {
    const schedules: any[] = [];

    // Aggregate principal and determine weighted interest and months
    let totalPrincipal = 0;
    let weightedPercentSum = 0;
    let percentWeightBase = 0;
    let totalMonths = 0;

    for (const item of items) {
      const principal = (item.price || 0) * (item.quantity || 0);
      totalPrincipal += principal;
      if (item.creditPercent) {
        weightedPercentSum += principal * (item.creditPercent || 0);
        percentWeightBase += principal;
      }
      if (item.creditMonth) {
        totalMonths = Math.max(totalMonths, item.creditMonth || 0);
      }
    }

    if (totalPrincipal > 0 && totalMonths > 0) {
      // To'g'ri hisoblash: oldindan to'lovni ayirib, keyin foiz qo'shish
      const upfrontPayment = downPayment || 0;
      const remainingPrincipal = Math.max(0, totalPrincipal - upfrontPayment);
      const effectivePercent = percentWeightBase > 0 ? (weightedPercentSum / percentWeightBase) : 0;
      
      console.log('=== BACKEND DEBUG ===');
      console.log('totalPrincipal:', totalPrincipal);
      console.log('upfrontPayment:', upfrontPayment);
      console.log('remainingPrincipal:', remainingPrincipal);
      console.log('weightedPercentSum:', weightedPercentSum);
      console.log('percentWeightBase:', percentWeightBase);
      console.log('effectivePercent:', effectivePercent);
      
      const interestAmount = remainingPrincipal * effectivePercent;
      const remainingWithInterest = remainingPrincipal + interestAmount;
      const monthlyPayment = remainingWithInterest / totalMonths;
      let remainingBalance = remainingWithInterest;
      
      console.log('interestAmount:', interestAmount);
      console.log('remainingWithInterest:', remainingWithInterest);
      console.log('monthlyPayment:', monthlyPayment);

      for (let month = 1; month <= totalMonths; month++) {
        // For the last month, use the exact remaining balance to avoid floating point errors
        const currentPayment = month === totalMonths ? remainingBalance : monthlyPayment;
        remainingBalance -= currentPayment;
        schedules.push({
          transactionId,
          month,
          payment: currentPayment,
          remainingBalance: Math.max(0, remainingBalance),
          isPaid: false,
          paidAmount: 0,
          // Oylik bo'lib to'lash uchun qo'shimcha ma'lumotlar
          installmentType: 'MONTHLY', // Oylik bo'lib to'lash turi
          totalMonths: totalMonths, // Jami oylar soni
          remainingMonths: totalMonths - month + 1 // Qolgan oylar soni
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
        }
        // TRANSFER uchun alohida metod ishlatiladi - updateProductQuantitiesForTransfer

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
      page = '1',
      limit = query.limit === 'all' ? undefined : (query.limit || 'all'),
      type,
      status,
      branchId,
      customerId,
      userId,
      startDate,
      endDate,
      paymentType,
      upfrontPaymentType,
      productId
    } = query;

    // Parse and validate page and limit
    const parsedPage = parseInt(page) || 1;
    const parsedLimit = limit && limit !== 'all' ? parseInt(limit) : undefined;
  
    console.log('=== BACKEND DEBUG ===');
    console.log('Query params:', query);
    console.log('BranchId:', branchId);
    console.log('UserId:', userId);
  
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
    if (userId) {
      // Filter by soldByUserId or userId (who created or sold the transaction)
      where.OR = where.OR ? [
        ...where.OR,
        { soldByUserId: parseInt(userId) },
        { userId: parseInt(userId) }
      ] : [
        { soldByUserId: parseInt(userId) },
        { userId: parseInt(userId) }
      ];
    }
    if (paymentType) where.paymentType = paymentType;
    if (upfrontPaymentType) where.upfrontPaymentType = upfrontPaymentType;
    if (productId) {
      where.items = {
        some: {
          productId: parseInt(productId)
        }
      };
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);

      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        customer: true,
        user: true,
        soldBy: true,
        fromBranch: true,
        toBranch: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: parsedLimit ? (parsedPage - 1) * parsedLimit : 0,
      take: parsedLimit,
    });

    const total = await this.prisma.transaction.count({ where });

    return {
      transactions,
      pagination: {
        page: parsedPage,
        limit: parsedLimit || total,
        total,
        pages: parsedLimit ? Math.ceil(total / parsedLimit) : 1
      }
    };
  }

  async findByProductId(productId: number, month?: string) {
    console.log(`Finding transactions for productId: ${productId}`);
    
    // First, let's check if the product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId }
    });
    
    if (!product) {
      console.log(`Product with ID ${productId} not found`);
      return {
        transactions: [],
        statusCounts: { PENDING: 0, COMPLETED: 0, CANCELLED: 0, total: 0 },
        typeCounts: { SALE: 0, PURCHASE: 0, TRANSFER: 0, RETURN: 0, WRITE_OFF: 0, STOCK_ADJUSTMENT: 0 }
      };
    }

    console.log(`Product found: ${product.name}`);

    // Build where clause with optional month filter
    const whereClause: any = {
      items: {
        some: {
          productId: productId
        }
      }
    };

    // Add month filter if provided
    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
      
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate
      };
      
      console.log(`Filtering by month: ${month}, from ${startDate} to ${endDate}`);
    }

    const transactions = await this.prisma.transaction.findMany({
      where: whereClause,
      include: {
        customer: true,
        user: true,
        soldBy: true,
        fromBranch: true,
        toBranch: true,
        items: {
          where: {
            productId: productId
          },
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totalAmount for each transaction if it's missing
    const transactionsWithAmounts = transactions.map(transaction => {
      let calculatedTotal = (transaction as any).totalAmount;
      
      // If totalAmount is 0 or null, calculate from items
      if (!calculatedTotal || calculatedTotal === 0) {
        calculatedTotal = transaction.items.reduce((sum, item) => {
          return sum + (item.total || (item.quantity * item.price));
        }, 0);
      }
      
      return {
        ...transaction,
        totalAmount: calculatedTotal
      } as any;
    });

    console.log(`Found ${transactions.length} transactions for product ${productId}`);

    // Calculate status counts
    const statusCounts = {
      PENDING: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      total: transactions.length
    };

    const typeCounts = {
      SALE: 0,
      PURCHASE: 0,
      TRANSFER: 0,
      RETURN: 0,
      WRITE_OFF: 0,
      STOCK_ADJUSTMENT: 0
    };

    transactionsWithAmounts.forEach(transaction => {
      statusCounts[transaction.status]++;
      typeCounts[transaction.type]++;
    });

    console.log('Status counts:', statusCounts);
    console.log('Type counts:', typeCounts);
    console.log('Transactions with amounts:', transactionsWithAmounts.map(t => ({ id: t.id, totalAmount: t.totalAmount, status: t.status, type: t.type })));

    return {
      transactions: transactionsWithAmounts,
      statusCounts,
      typeCounts
    };
  }

  async findOne(id: number) {
    // Validate that id is provided and is a valid number
    if (id === undefined || id === null || isNaN(id) || id <= 0) {
      throw new BadRequestException('Invalid transaction ID provided');
    }

    let transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        user: true,
        soldBy: true,
        fromBranch: true,
        toBranch: true,
        items: {
          include: {
            product: true
          }
        },
        paymentSchedules: {
          orderBy: { month: 'asc' },
          include: { paidBy: true }
        }
      }
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Hydrate missing products for a single transaction
    const hydrated = await this.hydrateMissingProducts([transaction]);
    return hydrated[0];
  }

  // Attach product details to items that have productId but product is null
  private async hydrateMissingProducts(transactions: any[]) {
    try {
      const missingIdsSet = new Set<number>();
      for (const tr of transactions) {
        if (!Array.isArray(tr?.items)) continue;
        for (const it of tr.items) {
          const raw = it?.productId;
          const pid = raw == null ? null : Number(raw);
          if (pid && !it?.product) missingIdsSet.add(pid);
        }
      }
      const missingIds = Array.from(missingIdsSet);
      if (missingIds.length === 0) return transactions;

      const products = await this.prisma.product.findMany({
        where: { id: { in: missingIds } },
      });
      const idToProduct: Record<number, any> = {};
      for (const p of products) idToProduct[p.id] = p;

      for (const tr of transactions) {
        if (!Array.isArray(tr?.items)) continue;
        for (const it of tr.items) {
          if (it && it.productId != null && !it.product) {
            const pid = Number(it.productId);
            it.product = (pid && idToProduct[pid]) ? idToProduct[pid] : null;
          }
        }
      }
      return transactions;
    } catch (e) {
      // If anything goes wrong, return original to avoid breaking flow
      return transactions;
    }
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto) {
    // Validate that id is provided and is a valid number
    if (id === undefined || id === null || isNaN(id) || id <= 0) {
      throw new BadRequestException('Invalid transaction ID provided');
    }

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
        soldBy: true,
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

  async remove(id: number, currentUser?: any) {
    // Validate that id is provided and is a valid number
    if (id === undefined || id === null || isNaN(id) || id <= 0) {
      throw new BadRequestException('Invalid transaction ID provided');
    }

    const transaction = await this.findOne(id);
    
    if (transaction.status === TransactionStatus.COMPLETED) {
      // Faqat ADMIN foydalanuvchiga ruxsat beramiz
      const role = currentUser?.role || currentUser?.userRole;
      if (role !== 'ADMIN') {
        throw new BadRequestException('Completed transactions cannot be deleted');
      }
    }

    // Hammasini bitta tranzaksiyada bajarish: miqdorlarni qaytarish, bog'liq yozuvlarni o'chirish, so'ng tranzaksiyani o'chirish
    return await this.prisma.$transaction(async (tx) => {
      // Mahsulot miqdorlarini qaytarish
      for (const item of transaction.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantity: { increment: item.quantity },
              status: 'IN_STORE'
            }
          });
        }
      }

      // Bog'liq to'lov yozuvlarini o'chirish (agar mavjud bo'lsa)
      // Baʼzi installlarda jadvallar nomi boshqacha bo‘lishi mumkin; mavjud bo‘lsa o‘chadi
      try { await tx.creditRepayment.deleteMany({ where: { transactionId: id } }); } catch {}
      try { await tx.dailyRepayment.deleteMany({ where: { transactionId: id } }); } catch {}

      // Bog'liq payment schedule va itemlarni o'chirish
      await tx.paymentSchedule.deleteMany({ where: { transactionId: id } });
      await tx.transactionItem.deleteMany({ where: { transactionId: id } });

      // Oxirida tranzaksiyani o'chirish
      return tx.transaction.delete({ where: { id } });
    });
  }

  // Qarzdorliklar ro'yxati (kredit / bo'lib to'lash)
  async getDebts(params: { branchId?: number; customerId?: number }) {
    const { branchId, customerId } = params || {};

    const where: any = {
      paymentType: {
        in: [PaymentType.CREDIT, PaymentType.INSTALLMENT]
      },
      status: { not: TransactionStatus.CANCELLED }
    };

    if (customerId) where.customerId = customerId;
    if (branchId) {
      // Filial bo'yicha mos keladigan transactionlar
      where.OR = [{ fromBranchId: branchId }, { toBranchId: branchId }];
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        customer: true,
        items: { include: { product: true } },
        paymentSchedules: { orderBy: { month: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const debts = transactions
      .map((t) => {
        const schedules = t.paymentSchedules || [];
        const totalPayable = schedules.reduce((sum, s) => sum + (s.payment || 0), 0);
        const totalPaidFromSchedules = schedules.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
        const upfrontPaid = (t.downPayment || 0) + (t.amountPaid || 0);
        const totalPaid = totalPaidFromSchedules + upfrontPaid;
        const outstanding = Math.max(0, totalPayable - totalPaid);

        // Keyingi to'lov (to'lanmagan birinchi oy)
        const nextDue = schedules.find(
          (s) => (s.paidAmount || 0) < (s.payment || 0) && !s.isPaid
        );

        const monthlyPayment = schedules.length > 0 ? schedules[0].payment : 0;

        return {
          transactionId: t.id,
          customer: t.customer
            ? {
                id: t.customer.id,
                fullName: t.customer.fullName,
                phone: t.customer.phone
              }
            : null,
          createdAt: t.createdAt,
          paymentType: t.paymentType,
          totalPayable,
          totalPaid,
          outstanding,
          monthlyPayment,
          nextDue: nextDue
            ? {
                month: nextDue.month,
                amountDue: Math.max(0, (nextDue.payment || 0) - (nextDue.paidAmount || 0)),
                remainingBalance: nextDue.remainingBalance
              }
            : null,
          items: (t.items || []).map((it) => ({
            id: it.id,
            productId: it.productId,
            productName: it.product?.name,
            quantity: it.quantity,
            price: it.price,
            total: it.total
          }))
        };
      })
      .filter((d) => d.outstanding > 0);

    // Mijoz bo'yicha jamlama
    const customerMap = new Map<
      number,
      {
        customerId: number;
        fullName: string | null;
        phone: string | null;
        totalPayable: number;
        totalPaid: number;
        outstanding: number;
        transactions: typeof debts;
      }
    >();

    for (const d of debts) {
      const key = d.customer?.id || 0;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerId: key,
          fullName: d.customer?.fullName || null,
          phone: d.customer?.phone || null,
          totalPayable: 0,
          totalPaid: 0,
          outstanding: 0,
          transactions: []
        });
      }
      const agg = customerMap.get(key)!;
      agg.totalPayable += d.totalPayable;
      agg.totalPaid += d.totalPaid;
      agg.outstanding += d.outstanding;
      agg.transactions.push(d);
    }

    const customers = Array.from(customerMap.values()).sort(
      (a, b) => b.outstanding - a.outstanding
    );

    const totalOutstanding = debts.reduce((sum, d) => sum + d.outstanding, 0);

    return {
      debts,
      customers,
      summary: {
        totalOutstanding,
        totalCustomers: customers.length,
        totalDebtTransactions: debts.length
      }
    };
  }

  // Mahsulot bo'yicha sotuvlar (sodda hisobot)
  async getProductSales(params: {
    productId?: number;
    branchId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const { productId, branchId, startDate, endDate } = params || {};

    const where: any = {
      transaction: {
        type: TransactionType.SALE as any
      }
    };

    if (productId) where.productId = productId;
    if (branchId) where.transaction.fromBranchId = branchId;

    if (startDate || endDate) {
      where.transaction.createdAt = {};
      if (startDate) where.transaction.createdAt.gte = new Date(startDate);
      if (endDate) where.transaction.createdAt.lte = new Date(endDate);
    }

    const items = await this.prisma.transactionItem.findMany({
      where,
      include: {
        product: true,
        transaction: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Mahsulot bo'yicha jamlash
    const productMap = new Map<
      number,
      { productId: number; productName: string | null; totalQuantity: number; totalAmount: number }
    >();

    // Sana bo'yicha jamlash (kunlik)
    const dailyMap = new Map<
      string,
      { date: string; totalQuantity: number; totalAmount: number }
    >();

    for (const it of items) {
      const pid = it.productId || 0;
      const pname = it.product?.name || null;
      if (!productMap.has(pid)) {
        productMap.set(pid, {
          productId: pid,
          productName: pname,
          totalQuantity: 0,
          totalAmount: 0
        });
      }
      const pAgg = productMap.get(pid)!;
      pAgg.totalQuantity += it.quantity;
      pAgg.totalAmount += it.total;

      const d = it.transaction?.createdAt
        ? new Date(it.transaction.createdAt)
        : new Date(it.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      if (!dailyMap.has(key)) {
        dailyMap.set(key, { date: key, totalQuantity: 0, totalAmount: 0 });
      }
      const dAgg = dailyMap.get(key)!;
      dAgg.totalQuantity += it.quantity;
      dAgg.totalAmount += it.total;
    }

    const products = Array.from(productMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity
    );
    const daily = Array.from(dailyMap.values()).sort((a, b) => (a.date < b.date ? -1 : 1));

    const totals = products.reduce(
      (acc, p) => {
        acc.totalQuantity += p.totalQuantity;
        acc.totalAmount += p.totalAmount;
        return acc;
      },
      { totalQuantity: 0, totalAmount: 0 }
    );

    return { products, daily, totals };
  }

  // Kredit to'lovlarini boshqarish
  async getPaymentSchedules(transactionId: number) {
    // Validate that transactionId is provided and is a valid number
    if (transactionId === undefined || transactionId === null || isNaN(transactionId) || transactionId <= 0) {
      throw new BadRequestException('Invalid transaction ID provided');
    }

    const transaction = await this.findOne(transactionId);
    return transaction.paymentSchedules;
  }

  async updatePaymentStatus(transactionId: number, month: number, paid: boolean) {
    // Validate that transactionId is provided and is a valid number
    if (transactionId === undefined || transactionId === null || isNaN(transactionId) || transactionId <= 0) {
      throw new BadRequestException('Invalid transaction ID provided');
    }

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
        total: total
      }
    });
    
    return transfer;
  }

  private async calculateAndCreateSalesBonuses(transaction: any, soldByUserId: number, createdById?: number) {
    try {
      console.log(' BONUS CALCULATION STARTED');
      console.log('Transaction ID:', transaction.id);
      console.log('Sold by user ID:', soldByUserId);
      console.log('Created by ID (cashier):', createdById);
      
      // Initialize total extra profit for this transaction
      let totalExtraProfit = 0;
      const extraProfitByProduct: Array<{
        productId: number;
        productName: string;
        quantity: number;
        extraPerItem: number;
        totalExtra: number;
        bonusPercentage: number;
        bonusAmount: number;
      }> = [];

      // Sotuvchining branch ma'lumotini olish
      const seller = await this.prisma.user.findUnique({
        where: { id: soldByUserId },
        include: { branch: true }
      });

      if (!seller || !seller.branchId) {
        console.log(' Sotuvchi yoki branch topilmadi, bonus hisoblanmaydi');
        return;
      }

      console.log(' Sotuvchi topildi:', seller.username, 'Role:', seller.role, 'Branch:', seller.branch?.name);

      // USD to UZS exchange rate olish
      const exchangeRate = await this.currencyExchangeRateService.getActiveRate('USD', 'UZS');
      const usdToUzsRate = exchangeRate ? Number(exchangeRate.rate) : 12500; // Default rate
      console.log(' USD/UZS kursi:', usdToUzsRate);

      // Bonus products qiymatini hisoblash - Frontend dan UZS da kelgan narhlarni ishlatish
      console.log('\n Bonus products qidirilmoqda, transaction ID:', transaction.id);
      
      const bonusProducts = await this.prisma.transactionBonusProduct.findMany({
        where: { transactionId: transaction.id },
        include: { product: true }
      });

      console.log(' Database dan topilgan bonus products:', bonusProducts.length, 'ta');
      console.log(' Bonus products ma\'lumotlari:', JSON.stringify(bonusProducts, null, 2));

      let totalBonusProductsValue = 0;
      if (bonusProducts.length > 0) {
        console.log('\n Bonus products topildi:', bonusProducts.length, 'ta');
        for (const bonusProduct of bonusProducts) {
          console.log(`\n Bonus product tekshirilmoqda:`);
          console.log(`  - Product ID: ${bonusProduct.productId}`);
          console.log(`  - Product name: ${bonusProduct.product?.name}`);
          console.log(`  - Product price (USD): ${bonusProduct.product?.price}`);
          console.log(`  - Quantity: ${bonusProduct.quantity}`);
          
          // Frontend dan UZS da konvert qilingan narh keladi, shuning uchun USD * rate qilmaslik kerak
          // Lekin agar frontend dan to'g'ri konvert qilinmagan bo'lsa, USD * rate qilamiz
          const productPriceInUzs = (bonusProduct.product?.price || 0) * usdToUzsRate;
          const productTotalValue = productPriceInUzs * bonusProduct.quantity;
          totalBonusProductsValue += productTotalValue;
          
          console.log(`  - Price in UZS (calculated): ${productPriceInUzs.toLocaleString()} som`);
          console.log(`  - Total value: ${productTotalValue.toLocaleString()} som`);
        }
        console.log('\n Jami bonus products qiymati:', totalBonusProductsValue.toLocaleString(), 'som');
      } else {
        console.log(' Bonus products topilmadi yoki bo\'sh');
      }
      
      // extraProfitByProduct is already declared at the beginning of the method

      // Har bir mahsulot uchun bonus hisoblash
      for (const item of transaction.items) {
        console.log('\n Mahsulot tekshirilmoqda:', item.productName);
        
        const sellingPrice = Number(item.sellingPrice || item.price);
        const originalPrice = Number(item.originalPrice || item.price);
        const quantity = Number(item.quantity || 1);

        console.log(' Narxlar:');
        console.log('  - Sotish narxi:', sellingPrice, 'som');
        console.log('  - Bozor narxi:', originalPrice, 'som');
        console.log('  - Miqdor:', quantity);

        // Product ma'lumotlarini olish (agar item.product yo'q bo'lsa)
        let productInfo = item.product;
        let bonusPercentage = Number(productInfo?.bonusPercentage || 0);
        
        // Agar product ma'lumoti yo'q bo'lsa yoki bonusPercentage yo'q bo'lsa, database dan olish
        if (!productInfo || bonusPercentage === 0) {
          if (item.productId) {
            const dbProduct = await this.prisma.product.findUnique({
              where: { id: item.productId }
            });
            console.log(' Database dan product ma\'lumoti olindi:', dbProduct?.name);
            
            if (dbProduct) {
              productInfo = dbProduct;
              bonusPercentage = Number(dbProduct.bonusPercentage || 0);
            }
          }
        }
        if (bonusPercentage <= 0) {
          console.log('   - Mahsulotda bonus foizi yo\'q');
        }

        // Agar sotish narxi bozor narxidan katta bo'lsa, bonus hisoblaymiz
        if (sellingPrice > originalPrice) {
          const extraPerItem = sellingPrice - originalPrice;
          const totalExtra = extraPerItem * quantity;
          const bonusAmount = (totalExtra * bonusPercentage) / 100;
          
          // Add to total extra profit
          totalExtraProfit += totalExtra;
          
          // Store extra profit by product for detailed logging
          extraProfitByProduct.push({
            productId: item.productId,
            productName: item.productName || `Product ${item.productId}`,
            quantity: quantity,
            extraPerItem: extraPerItem,
            totalExtra: totalExtra,
            bonusPercentage: bonusPercentage,
            bonusAmount: bonusAmount
          });
        }
      }

      // Update transaction with total extra profit if any
      if (totalExtraProfit > 0) {
        console.log('\n Jami ortiqcha foyda:', totalExtraProfit.toLocaleString(), 'som');
        
        // Update the transaction with extra profit
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { 
            extraProfit: totalExtraProfit,
            description: transaction.description 
              ? `${transaction.description}\nOrtiqcha foyda: ${totalExtraProfit.toLocaleString()} som`
              : `Ortiqcha foyda: ${totalExtraProfit.toLocaleString()} som`
          }
        });
        
        console.log(' Ortiqcha foyda transaksiyaga yozib qo\'yildi');
        
        // Log detailed extra profit information
        console.log('\n Mahsulot bo\'yicha ortiqcha foyda:');
        extraProfitByProduct.forEach(item => {
          console.log(`  - ${item.productName} (${item.quantity} ta):`);
          console.log(`    - Ortiqcha narx: ${item.extraPerItem.toLocaleString()} som/ta`);
          console.log(`    - Jami ortiqcha: ${item.totalExtra.toLocaleString()} som`);
          console.log(`    - Bonus foizi: ${item.bonusPercentage}%`);
          console.log(`    - Bonus miqdori: ${item.bonusAmount.toLocaleString()} som`);
        });
      }
      
      console.log('\n Barcha bonuslar muvaffaqiyatli yaratildi');
    } catch (error) {
      console.error('Bonus hisoblashda xatolik:', error);
    }
  }
}