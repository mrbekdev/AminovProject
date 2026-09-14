import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyExchangeRateService } from '../currency-exchange-rate/currency-exchange-rate.service';
import { ProductHistoryService } from '../product-history/product-history.service';
import { CreateTradeInProductDto } from './dto/create-trade-in-product.dto';
import { ApproveTradeInProductDto } from './dto/approve-trade-in-product.dto';

@Injectable()
export class TradeInProductService {
  constructor(
    private prisma: PrismaService,
    private currencyExchangeRateService: CurrencyExchangeRateService,
    private historyService: ProductHistoryService,
  ) {}

  private async generateUniqueBarcode(tx: any): Promise<string> {
    let counterRecord = await tx.barcodeCounter.findFirst();

    if (!counterRecord) {
      counterRecord = await tx.barcodeCounter.create({
        data: { counter: 1000000000n },
      });
    }

    counterRecord = await tx.barcodeCounter.update({
      where: { id: counterRecord.id },
      data: { counter: counterRecord.counter + 1n },
    });

    return counterRecord.counter.toString();
  }

  public async getUsdToUzsRate(branchId?: number): Promise<number> {
    try {
      if (branchId) {
        const branchRate = await this.prisma.currencyExchangeRate.findFirst({
          where: { branchId, isActive: true },
          orderBy: { createdAt: 'desc' },
        });
        if (branchRate && Number(branchRate.rate) > 100) {
          return Number(branchRate.rate);
        }
      }

      const activeRate = await this.prisma.currencyExchangeRate.findFirst({
        where: {
          isActive: true,
          OR: [
            { fromCurrency: 'USD', toCurrency: 'UZS' },
            { fromCurrency: 'USD' },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      if (activeRate && Number(activeRate.rate) > 100) {
        return Number(activeRate.rate);
      }

      const anyRate = await this.prisma.currencyExchangeRate.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      if (anyRate && Number(anyRate.rate) > 100) {
        return Number(anyRate.rate);
      }
    } catch (e) {
      console.error('getUsdToUzsRate error:', e);
    }
    return 12600; // Standart fallback kurs
  }

  async create(dto: CreateTradeInProductDto, userId?: number) {
    const branchId = Number(dto.branchId);
    if (!branchId) {
      throw new BadRequestException('Filial ID kiritilishi shart');
    }

    const rate = await this.getUsdToUzsRate(branchId);
    const costPrice = Number(dto.costPrice || 0);
    const costPriceUSD = (dto.costPriceUSD != null && Number(dto.costPriceUSD) > 0 && Number(dto.costPriceUSD) < costPrice)
      ? Number(dto.costPriceUSD)
      : (rate > 1 ? Number((costPrice / rate).toFixed(2)) : costPrice);

    return this.prisma.tradeInProduct.create({
      data: {
        name: dto.name.trim(),
        model: dto.model ? dto.model.trim() : null,
        barcode: dto.barcode ? dto.barcode.trim() : null,
        costPrice,
        costPriceUSD,
        quantity: Number(dto.quantity || 1),
        branchId,
        userId: userId || null,
        transactionId: dto.transactionId ? Number(dto.transactionId) : null,
        customerId: dto.customerId ? Number(dto.customerId) : null,
        categoryId: dto.categoryId ? Number(dto.categoryId) : null,
        notes: dto.notes ? dto.notes.trim() : null,
        status: 'PENDING',
      },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true, username: true } },
        customer: { select: { id: true, fullName: true, phone: true } },
        transaction: { select: { id: true, total: true, createdAt: true } },
      },
    });
  }

  async findAll(query: {
    branchId?: number | string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    const where: any = {};

    if (query.branchId && query.branchId !== '' && query.branchId !== 'all') {
      where.branchId = Number(query.branchId);
    }

    if (query.status && query.status !== '' && query.status !== 'all') {
      where.status = query.status.toUpperCase();
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { model: { contains: s, mode: 'insensitive' } },
        { barcode: { contains: s, mode: 'insensitive' } },
        { customer: { fullName: { contains: s, mode: 'insensitive' } } },
        { customer: { phone: { contains: s, mode: 'insensitive' } } },
        { user: { firstName: { contains: s, mode: 'insensitive' } } },
        { user: { lastName: { contains: s, mode: 'insensitive' } } },
        { user: { username: { contains: s, mode: 'insensitive' } } },
      ];
      const parsedNum = parseInt(s, 10);
      if (!isNaN(parsedNum)) {
        where.OR.push({ transactionId: parsedNum });
      }
    }

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.tradeInProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true, username: true } },
          customer: { select: { id: true, fullName: true, phone: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true, username: true } },
          approvedProduct: { select: { id: true, name: true, model: true, barcode: true, price: true, marketPrice: true, quantity: true } },
          category: { select: { id: true, name: true } },
          transaction: {
            select: {
              id: true,
              total: true,
              finalTotal: true,
              createdAt: true,
              paymentType: true,
              payments: { select: { method: true, amount: true } },
            },
          },
        },
      }),
      this.prisma.tradeInProduct.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPendingCount(branchId?: number | string) {
    const where: any = { status: 'PENDING' };
    if (branchId && branchId !== '' && branchId !== 'all') {
      where.branchId = Number(branchId);
    }
    const count = await this.prisma.tradeInProduct.count({ where });
    return { count };
  }

  async findOne(id: number) {
    const tradeIn = await this.prisma.tradeInProduct.findUnique({
      where: { id },
      include: {
        branch: true,
        user: { select: { id: true, firstName: true, lastName: true, username: true } },
        customer: true,
        approvedBy: { select: { id: true, firstName: true, lastName: true, username: true } },
        approvedProduct: true,
        category: true,
        transaction: {
          include: {
            customer: true,
            payments: true,
            items: { include: { product: true } },
          },
        },
      },
    });

    if (!tradeIn) {
      throw new NotFoundException(`Trade-in mahsulot (ID: ${id}) topilmadi`);
    }

    return tradeIn;
  }

  async approve(id: number, dto: ApproveTradeInProductDto, adminUserId: number) {
    const tradeIn = await this.prisma.tradeInProduct.findUnique({
      where: { id },
      include: { branch: true },
    });

    if (!tradeIn) {
      throw new NotFoundException(`Trade-in mahsulot (ID: ${id}) topilmadi`);
    }

    if (tradeIn.status === 'APPROVED') {
      throw new BadRequestException('Ushbu mahsulot allaqachon tasdiqlangan va inventarga kiritilgan');
    }

    const branchId = dto.branchId ? Number(dto.branchId) : tradeIn.branchId;
    const rate = await this.getUsdToUzsRate(branchId);

    // Cost price USD va UZS
    const costPriceUZS = Number(tradeIn.costPrice || 0);
    let costPriceUSD = Number(tradeIn.costPriceUSD || 0);
    if (!costPriceUSD || costPriceUSD >= costPriceUZS) {
      costPriceUSD = rate > 1 ? Number((costPriceUZS / rate).toFixed(2)) : costPriceUZS;
    }

    // Selling price USD va UZS
    let sellingPriceUSD: number;
    let sellingPriceUZS: number;

    if (dto.sellingPriceUSD != null && Number(dto.sellingPriceUSD) > 0) {
      sellingPriceUSD = Number(dto.sellingPriceUSD);
      sellingPriceUZS = dto.sellingPrice && Number(dto.sellingPrice) > sellingPriceUSD
        ? Number(dto.sellingPrice)
        : Math.round(sellingPriceUSD * rate);
    } else if (dto.sellingPrice != null && Number(dto.sellingPrice) > 0) {
      const rawSelling = Number(dto.sellingPrice);
      if (rawSelling > 1000) {
        // So'mda kiritilgan bo'lsa, dollarga o'giramiz
        sellingPriceUZS = rawSelling;
        sellingPriceUSD = Number((rawSelling / rate).toFixed(2));
      } else {
        // Dollarda kiritilgan bo'lsa
        sellingPriceUSD = rawSelling;
        sellingPriceUZS = Math.round(rawSelling * rate);
      }
    } else {
      sellingPriceUSD = Number((costPriceUSD * 1.3).toFixed(2));
      sellingPriceUZS = Math.round(sellingPriceUSD * rate);
    }

    const quantity = Number(dto.quantity || tradeIn.quantity || 1);
    const productName = (dto.name || tradeIn.name).trim();
    const productModel = (dto.model || tradeIn.model || '').trim();
    const bonusPercentage = Number(dto.bonusPercentage || 0);

    // Categoryni aniqlash
    let categoryId = dto.categoryId || tradeIn.categoryId;
    if (!categoryId) {
      const defaultCategory = await this.prisma.category.findFirst({
        where: { OR: [{ branchId }, { branchId: null }] },
      });
      if (defaultCategory) {
        categoryId = defaultCategory.id;
      } else {
        const newCat = await this.prisma.category.create({
          data: { name: 'Trade-in (Qabul qilinganlar)', branchId },
        });
        categoryId = newCat.id;
      }
    }

    // Barcode generatsiya yoki mavjudini olish
    let barcode = dto.barcode || tradeIn.barcode;
    if (!barcode) {
      barcode = await this.generateUniqueBarcode(this.prisma);
    }

    // Check if product already exists with same barcode in this branch
    let product = await this.prisma.product.findFirst({
      where: {
        barcode,
        branchId,
        isDeleted: false,
      },
    });

    if (product) {
      // Mavjud mahsulot miqdorini oshirish
      product = await this.prisma.product.update({
        where: { id: product.id },
        data: {
          quantity: product.quantity + quantity,
          marketPrice: sellingPriceUSD,
          price: costPriceUSD, // yangilangan cost price USD ($)
          bonusPercentage: bonusPercentage,
        },
      });
    } else {
      // Yangi mahsulot yaratish (Product.price = USD kelish, Product.marketPrice = USD sotuv)
      product = await this.prisma.product.create({
        data: {
          name: productName,
          model: productModel || null,
          barcode,
          price: costPriceUSD, // Product.price = kelish narxi USD ($)
          marketPrice: sellingPriceUSD, // Product.marketPrice = sotish narxi USD ($)
          quantity,
          initialQuantity: quantity,
          branchId,
          categoryId,
          status: 'IN_STORE',
          bonusPercentage: bonusPercentage,
          months: dto.months || null,
        },
      });
    }

    // Product History log yaratish
    try {
      await this.historyService.createLog({
        productId: product.id,
        actionType: 'CREATED',
        performedById: adminUserId,
        quantityChange: quantity,
        priceChange: costPriceUSD,
        description: `Trade-in (Tovar to'lovi) orqali qabul qilindi va tasdiqlandi. Trade-In ID: ${tradeIn.id}${tradeIn.transactionId ? `, Tranzaksiya: #${tradeIn.transactionId}` : ''}`,
        newValues: {
          name: productName,
          model: productModel,
          price: costPriceUSD,
          marketPrice: sellingPriceUSD,
          quantity,
        },
      });
    } catch (e) {
      console.error('Failed to log product history for trade-in approve:', e);
    }

    // TradeInProduct statusini APPROVED qilish
    const updatedTradeIn = await this.prisma.tradeInProduct.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: adminUserId,
        approvedAt: new Date(),
        approvedProductId: product.id,
        costPrice: costPriceUZS,
        costPriceUSD: costPriceUSD,
        sellingPrice: sellingPriceUZS,
        sellingPriceUSD: sellingPriceUSD,
        categoryId: categoryId,
        barcode: barcode,
        branchId: branchId,
      },
      include: {
        branch: true,
        user: true,
        customer: true,
        approvedBy: true,
        approvedProduct: true,
        category: true,
      },
    });

    return {
      message: 'Trade-in mahsulot muvaffaqiyatli tasdiqlandi va inventarga qo\'shildi',
      tradeIn: updatedTradeIn,
      product,
    };
  }

  async reject(id: number, reason: string, adminUserId: number) {
    const tradeIn = await this.prisma.tradeInProduct.findUnique({
      where: { id },
    });

    if (!tradeIn) {
      throw new NotFoundException(`Trade-in mahsulot (ID: ${id}) topilmadi`);
    }

    if (tradeIn.status === 'APPROVED') {
      throw new BadRequestException('Tasdiqlangan mahsulotni rad etib bo\'lmaydi');
    }

    return this.prisma.tradeInProduct.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: adminUserId,
        notes: reason ? `${tradeIn.notes ? tradeIn.notes + ' | ' : ''}Rad etildi: ${reason}` : tradeIn.notes,
      },
      include: {
        branch: true,
        user: true,
        customer: true,
        approvedBy: true,
      },
    });
  }

  async update(id: number, dto: Partial<CreateTradeInProductDto>, userId?: number) {
    const tradeIn = await this.prisma.tradeInProduct.findUnique({ where: { id } });
    if (!tradeIn) {
      throw new NotFoundException(`Trade-in mahsulot (ID: ${id}) topilmadi`);
    }

    if (tradeIn.status === 'APPROVED') {
      throw new BadRequestException('Tasdiqlangan mahsulotni o\'zgartirib bo\'lmaydi');
    }

    const data: any = {};
    if (dto.name) data.name = dto.name.trim();
    if (dto.model !== undefined) data.model = dto.model ? dto.model.trim() : null;
    if (dto.barcode !== undefined) data.barcode = dto.barcode ? dto.barcode.trim() : null;
    if (dto.costPrice !== undefined) data.costPrice = Number(dto.costPrice);
    if (dto.quantity !== undefined) data.quantity = Number(dto.quantity);
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId ? Number(dto.categoryId) : null;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.tradeInProduct.update({
      where: { id },
      data,
      include: {
        branch: true,
        user: true,
        customer: true,
        category: true,
      },
    });
  }

  async delete(id: number) {
    const tradeIn = await this.prisma.tradeInProduct.findUnique({ where: { id } });
    if (!tradeIn) {
      throw new NotFoundException(`Trade-in mahsulot (ID: ${id}) topilmadi`);
    }

    if (tradeIn.status === 'APPROVED') {
      throw new BadRequestException('Tasdiqlangan mahsulotni o\'chirib bo\'lmaydi');
    }

    return this.prisma.tradeInProduct.delete({ where: { id } });
  }
}
