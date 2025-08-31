import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionType, TransactionStatus, PaymentType } from '@prisma/client';
import { CurrencyExchangeRateService } from '../currency-exchange-rate/currency-exchange-rate.service';

@Injectable()
export class TransactionService {
  constructor(
    private prisma: PrismaService,
    private currencyExchangeRateService: CurrencyExchangeRateService,
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

    // Transaction yaratish
    const transaction = await this.prisma.transaction.create({
      data: {
        ...transactionData,
        customerId,
        userId: createdByUserId || null, // yaratgan foydalanuvchi
        soldByUserId: soldByUserId || null, // sotgan kassir
        upfrontPaymentType: (transactionData as any).upfrontPaymentType || 'CASH', // Default to CASH if not specified
        termUnit: (transactionData as any).termUnit || 'MONTHS', // Default to MONTHS if not specified
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

    // Kredit bo'lsa, oylik to'lovlar jadvalini yaratish
    if (transaction.paymentType === PaymentType.CREDIT || transaction.paymentType === PaymentType.INSTALLMENT) {
      // Kunlik yoki oylik to'lovlarni tekshirish
      const isDays = (transaction as any).termUnit === 'DAYS';
      if (isDays) {
        await this.createDailyPaymentSchedule(transaction.id, transaction.items, createTransactionDto.downPayment || 0);
      } else {
        await this.createPaymentSchedule(transaction.id, transaction.items, createTransactionDto.downPayment || 0);
      }
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
      const interestAmount = remainingPrincipal * (effectivePercent / 100);
      const remainingWithInterest = remainingPrincipal + interestAmount;
      const dailyPayment = remainingWithInterest / totalDays;
      let remainingBalance = remainingWithInterest;

      for (let day = 1; day <= totalDays; day++) {
        remainingBalance -= dailyPayment;
        schedules.push({
          transactionId,
          month: day, // month field kunlar uchun ham ishlatiladi
          payment: dailyPayment,
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
      const interestAmount = remainingPrincipal * (effectivePercent / 100);
      const remainingWithInterest = remainingPrincipal + interestAmount;
      const monthlyPayment = remainingWithInterest / totalMonths;
      let remainingBalance = remainingWithInterest;

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
      page = 1,
      limit = 10,
      type,
      status,
      branchId,
      customerId,
      startDate,
      endDate,
      paymentType,
      upfrontPaymentType,
      productId
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
  
    const total = await this.prisma.transaction.count({ where });
  
    let transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        customer: true,
        user: true,
        soldBy: true,
        fromBranch: true,
        toBranch: true,
        items: {
          include: { product: true }
        },
        paymentSchedules: { orderBy: { month: 'asc' }, include: { paidBy: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Hydrate items where product is null but productId exists
    transactions = await this.hydrateMissingProducts(transactions);

    console.log('Transactions found:', transactions);
  
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

  async remove(id: number) {
    // Validate that id is provided and is a valid number
    if (id === undefined || id === null || isNaN(id) || id <= 0) {
      throw new BadRequestException('Invalid transaction ID provided');
    }

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
        total: total,
        finalTotal: total, // Transfer uchun total va finalTotal bir xil
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            sellingPrice: item.sellingPrice || item.price,
            originalPrice: item.originalPrice || item.price,
            total: item.price * item.quantity
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

    // Mahsulot miqdorlarini darhol yangilash - manba filialdan kamaytirish va maqsad filialga qo'shish
    await this.updateProductQuantitiesForTransfer(transfer);

    return transfer;
  }

  // Filial bo'yicha barcha o'tkazmalarni olish (kiruvchi va chiqim)
  async getTransfersByBranch(branchId: number) {
    const where: any = {
      type: TransactionType.TRANSFER
    };

    // Filialdan chiqgan va kirgan o'tkazmalarni olish
    where.OR = [
      { fromBranchId: branchId },
      { toBranchId: branchId }
    ];

    let tx = await this.prisma.transaction.findMany({
      where,
      include: {
        fromBranch: true,
        toBranch: true,
        soldBy: true,
        user: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
                branch: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    tx = await this.hydrateMissingProducts(tx);
    return tx;
  }

  // Pending transferlarni olish
  async getPendingTransfers(branchId?: number) {
    const where: any = {
      type: TransactionType.TRANSFER,
      status: TransactionStatus.PENDING
    };

    if (branchId) {
      where.OR = [
        { fromBranchId: branchId },
        { toBranchId: branchId }
      ];
    }

    let tx = await this.prisma.transaction.findMany({
      where,
      include: {
        fromBranch: true,
        toBranch: true,
        soldBy: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    tx = await this.hydrateMissingProducts(tx);
    return tx;
  }

  private async updateProductQuantitiesForTransfer(transfer: any) {
    for (const item of transfer.items) {
      if (item.productId && item.product) {
        console.log(`🔄 Processing transfer item: ${item.product.name} (${item.quantity})`);
        
        // Manba filialdan mahsulotni topish va miqdorini kamaytirish
        const sourceProduct = await this.prisma.product.findFirst({
          where: {
            id: item.productId,
            branchId: transfer.fromBranchId
          }
        });

        if (sourceProduct) {
          console.log(`📤 Source product found: ${sourceProduct.name}, current quantity: ${sourceProduct.quantity}`);
          // Manba filialdan kamaytirish
          await this.prisma.product.update({
            where: { id: sourceProduct.id },
            data: {
              quantity: Math.max(0, sourceProduct.quantity - item.quantity),
              status: sourceProduct.quantity - item.quantity === 0 ? 'SOLD' : 'IN_STORE'
            }
          });
          console.log(`📤 Source product updated: new quantity: ${Math.max(0, sourceProduct.quantity - item.quantity)}`);
        }

        // Maqsad filialda mahsulotni topish yoki yaratish
        // Avval barcode bilan qidirish, keyin name bilan (case-insensitive)
        let targetProduct: any = null;
        
        if (item.product.barcode) {
          console.log(`🔍 Searching by barcode: ${item.product.barcode}`);
          // Barcode bilan qidirish
          targetProduct = await this.prisma.product.findFirst({
            where: {
              barcode: item.product.barcode,
              branchId: transfer.toBranchId
            }
          });
          if (targetProduct) {
            console.log(`✅ Found existing product by barcode: ${targetProduct.name}`);
          }
        }
        
        // Agar barcode bilan topilmagan bo'lsa, name bilan qidirish (case-insensitive)
        if (!targetProduct) {
          console.log(`🔍 Searching by name: "${item.product.name}"`);
          
          // Prisma da case-insensitive qidirish uchun contains va mode: 'insensitive' ishlatamiz
          targetProduct = await this.prisma.product.findFirst({
            where: {
              AND: [
                {
                  OR: [
                    { name: { equals: item.product.name, mode: 'insensitive' } },
                    { name: { contains: item.product.name, mode: 'insensitive' } },
                    { name: { contains: item.product.name.trim(), mode: 'insensitive' } }
                  ]
                },
                { branchId: transfer.toBranchId }
              ]
            }
          });
          
          if (targetProduct) {
            console.log(`✅ Found existing product by name: ${targetProduct.name} (current quantity: ${targetProduct.quantity})`);
          } else {
            console.log(`❌ No existing product found by name: "${item.product.name}"`);
          }
        }

        if (targetProduct) {
          // Mavjud mahsulotga qo'shish
          const newQuantity = targetProduct.quantity + item.quantity;
          console.log(`📥 Updating existing product: ${targetProduct.name}, adding ${item.quantity} to current ${targetProduct.quantity} = ${newQuantity}`);
          
          await this.prisma.product.update({
            where: { id: targetProduct.id },
            data: {
              quantity: newQuantity,
              status: 'IN_WAREHOUSE'
            }
          });
          console.log(`✅ Existing product updated successfully`);
        } else {
          // Yangi mahsulot yaratish - barcode unique constraint ni hisobga olish
          console.log(`🆕 Creating new product: ${item.product.name} in branch ${transfer.toBranchId} with quantity ${item.quantity}`);
          
          try {
            const newProduct = await this.prisma.product.create({
              data: {
                name: item.product.name,
                barcode: item.product.barcode || `TRANSFER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                model: item.product.model,
                price: item.product.price,
                quantity: item.quantity,
                status: 'IN_WAREHOUSE',
                branchId: transfer.toBranchId,
                categoryId: item.product.categoryId,
                marketPrice: item.product.marketPrice
              }
            });
            console.log(`✅ New product created successfully: ${newProduct.name} (ID: ${newProduct.id})`);
          } catch (error) {
            console.error(`❌ Error creating new product:`, error);
            // Agar barcode bilan xatolik bo'lsa, unique barcode yaratish
            if (error.code === 'P2002') {
              console.log(`🔄 Retrying with unique barcode...`);
              const uniqueBarcode = `TRANSFER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const newProduct = await this.prisma.product.create({
                data: {
                  name: item.product.name,
                  barcode: uniqueBarcode,
                  model: item.product.model,
                  price: item.product.price,
                  quantity: item.quantity,
                  status: 'IN_WAREHOUSE',
                  branchId: transfer.toBranchId,
                  categoryId: item.product.categoryId,
                  marketPrice: item.product.marketPrice
                }
              });
              console.log(`✅ New product created with unique barcode: ${newProduct.name} (ID: ${newProduct.id})`);
            } else {
              throw error;
            }
          }
        }
      }
    }
  }

  async approveTransfer(id: number, approvedById: number) {
    // Validate that id is provided and is a valid number
    if (id === undefined || id === null || isNaN(id) || id <= 0) {
      throw new BadRequestException('Invalid transaction ID provided');
    }

    const transaction = await this.findOne(id);
    
    if (transaction.type !== TransactionType.TRANSFER) {
      throw new BadRequestException('Only transfer transactions can be approved');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Transaction is not pending');
    }

    // O'tkazmani tasdiqlash - mahsulotlar allaqachon ko'chirilgan
    return this.prisma.transaction.update({
      where: { id },
      data: {
        status: TransactionStatus.COMPLETED,
        userId: approvedById
      }
    });
  }

  async rejectTransfer(id: number) {
    // Validate that id is provided and is a valid number
    if (id === undefined || id === null || isNaN(id) || id <= 0) {
      throw new BadRequestException('Invalid transaction ID provided');
    }

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

    const [totalSales, creditSales, cashSales, cardSales, purchases, transfers, upfrontCashSales, upfrontCardSales] = await Promise.all([
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
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.SALE, upfrontPaymentType: 'CASH' },
        _sum: { downPayment: true, amountPaid: true },
        _count: true
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.SALE, upfrontPaymentType: 'CARD' },
        _sum: { downPayment: true, amountPaid: true },
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
      transferTransactions: transfers._count || 0,
      upfrontCashTotal: (upfrontCashSales._sum.downPayment || 0) + (upfrontCashSales._sum.amountPaid || 0),
      upfrontCashTransactions: upfrontCashSales._count || 0,
      upfrontCardTotal: (upfrontCardSales._sum.downPayment || 0) + (upfrontCardSales._sum.amountPaid || 0),
      upfrontCardTransactions: upfrontCardSales._count || 0
    };
  }

  // Currency conversion methods
  async getTransactionWithCurrencyConversion(id: number, branchId?: number) {
    const transaction = await this.findOne(id);
    if (!transaction) return null;

    // Convert totals to som
    const totalInSom = await this.currencyExchangeRateService.convertCurrency(
      transaction.total,
      'USD',
      'UZS',
      branchId || transaction.fromBranchId || undefined,
    );

    const finalTotalInSom = await this.currencyExchangeRateService.convertCurrency(
      transaction.finalTotal,
      'USD',
      'UZS',
      branchId || transaction.fromBranchId || undefined,
    );

    return {
      ...transaction,
      totalInSom,
      finalTotalInSom,
      totalInDollar: transaction.total,
      finalTotalInDollar: transaction.finalTotal,
    };
  }

  async getTransactionsWithCurrencyConversion(branchId?: number, startDate?: string, endDate?: string) {
    const result = await this.findAll({ branchId, startDate, endDate });
    const transactions = result.transactions;
    
    // Convert all transaction totals to som
    const transactionsWithCurrency = await Promise.all(
      transactions.map(async (transaction) => {
        const totalInSom = await this.currencyExchangeRateService.convertCurrency(
          transaction.total,
          'USD',
          'UZS',
          branchId || transaction.fromBranchId || undefined,
        );

        const finalTotalInSom = await this.currencyExchangeRateService.convertCurrency(
          transaction.finalTotal,
          'USD',
          'UZS',
          branchId || transaction.fromBranchId || undefined,
        );

        return {
          ...transaction,
          totalInSom,
          finalTotalInSom,
          totalInDollar: transaction.total,
          finalTotalInDollar: transaction.finalTotal,
        };
      }),
    );

    return transactionsWithCurrency;
  }
}