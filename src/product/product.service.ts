import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma, PrismaClient, ProductStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import { CurrencyExchangeRateService } from '../currency-exchange-rate/currency-exchange-rate.service';
import { ProductHistoryService } from '../product-history/product-history.service';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private currencyExchangeRateService: CurrencyExchangeRateService,
    private historyService: ProductHistoryService,
  ) {}
private async generateUniqueBarcode(tx: any): Promise<string> {
  // mavjud counterni olamiz yoki 0 yaratib qo'yamiz
  let counterRecord = await tx.barcodeCounter.findFirst();

  if (!counterRecord) {
    counterRecord = await tx.barcodeCounter.create({
      data: { counter: 1n }, // 1 dan boshlaymiz
    });
  } else {
    counterRecord = await tx.barcodeCounter.update({
      where: { id: counterRecord.id },
      data: { counter: counterRecord.counter + 1n },
    });
  }

  // 13 xonali EAN-13 shtrix kod hosil qilish
  // Masalan: 2000000000001
  const prefix = '20';
  const numberStr = counterRecord.counter.toString().padStart(10, '0');
  const rawCode = `${prefix}${numberStr}`;

  // EAN-13 uchun Check Digit (nazorat raqami) hisoblash
  let sumOdd = 0;
  let sumEven = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(rawCode[i], 10);
    if (i % 2 === 0) {
      sumOdd += digit;
    } else {
      sumEven += digit;
    }
  }
  const totalSum = sumOdd + sumEven * 3;
  const checkDigit = (10 - (totalSum % 10)) % 10;

  return `${rawCode}${checkDigit}`;
}

async create(
  createProductDto: CreateProductDto,
  userId: number,
  prismaClient: PrismaClient | Prisma.TransactionClient = this.prisma,
) {
  const product = await prismaClient.product.create({
    data: {
      name: createProductDto.name,
      barcode: await this.generateUniqueBarcode(prismaClient),
      categoryId: createProductDto.categoryId,
      branchId: createProductDto.branchId,
      price: createProductDto.price,
      marketPrice: createProductDto.marketPrice,
      model: createProductDto.model,
      months: createProductDto.months,
      initialQuantity: createProductDto.quantity,
      quantity: createProductDto.quantity,
      status: createProductDto.status || 'IN_STORE',
      defectiveQuantity: 0,
      bonusPercentage: createProductDto.bonusPercentage || 0,
    },
  });

  if (createProductDto.quantity && createProductDto.quantity > 0) {
    const transaction = await prismaClient.transaction.create({
      data: {
        userId,
        type: 'PURCHASE',
        status: 'COMPLETED',
        discount: 0,
        total: 0,
        finalTotal: 0,
        amountPaid: 0,
        remainingBalance: 0,
        description: 'Маҳсулот яратилгандаги бошланғич қолдиқ',
      },
    });

    await prismaClient.transactionItem.create({
      data: {
        transactionId: transaction.id,
        productId: product.id,
        quantity: createProductDto.quantity,
        price: 0,
        total: 0,
      },
    });
  }

  // Tovar yaratilish tarixini saqlash
  try {
    await this.historyService.createLog({
      productId: product.id,
      actionType: 'CREATED',
      performedById: userId,
      description: `Yangi tovar yaratildi: "${product.name}"${product.model ? ` (${product.model})` : ''}. Boshlang'ich miqdor: ${product.quantity} dona. Narx: $${product.price}${product.marketPrice ? `, Kirim narx: $${product.marketPrice}` : ''}`,
      newValues: {
        name: product.name,
        model: product.model,
        price: product.price,
        marketPrice: product.marketPrice,
        quantity: product.quantity,
        barcode: product.barcode,
        branchId: product.branchId,
      },
      quantityChange: product.quantity,
      priceChange: product.price,
    });
  } catch (err) {
    console.error('Error logging CREATED product history:', err);
  }

  return product;
}


  async findAll(
    branchId?: number,
    search?: string,
    includeZeroQuantity: boolean = false,
    categoryId?: number,
    status?: string,
    bonus?: number,
    page?: number,
    limit?: number,
  ) {
    const where: Prisma.ProductWhereInput = {
      isDeleted: false,
      branch: { status: { not: 'DELETED' } },
    };

    if (branchId) {
      const bStr = String(branchId);
      if (bStr.includes(',')) {
        const ids = bStr.split(',').map(n => Number(n.trim())).filter(n => !isNaN(n));
        if (ids.length > 0) {
          where.branchId = { in: ids };
        }
      } else {
        where.branchId = Number(branchId);
      }
    }

    if (categoryId) {
      where.categoryId = Number(categoryId);
    }

    if (bonus !== undefined && !isNaN(bonus)) {
      where.bonusPercentage = Number(bonus);
    }

    if (!includeZeroQuantity) {
      where.quantity = { gt: 0 };
    }

    const andConditions: any[] = [];

    if (search) {
      const rawSearch = String(search).trim();
      if (rawSearch) {
        // Remove noise punctuation like parentheses, quotes, brackets, etc.
        const cleaned = rawSearch.replace(/[\(\)\[\]\{\}\"\'\`,\?!\+]/g, ' ').trim();

        // Split by whitespace, dashes, slashes, underscores, dots, colons into distinct tokens
        const tokens = Array.from(
          new Set(cleaned.split(/[\s\-_\/:\;.]+/).filter((t) => t.length > 0))
        );

        const fieldMatch = (term: string) => ({
          OR: [
            { name: { contains: term, mode: 'insensitive' as const } },
            { model: { contains: term, mode: 'insensitive' as const } },
            { barcode: { contains: term, mode: 'insensitive' as const } },
            { category: { name: { contains: term, mode: 'insensitive' as const } } },
          ],
        });

        if (tokens.length > 0) {
          // Every token in the search string must match in AT LEAST ONE field (name, model, barcode, category)
          // e.g., "avt f2j" -> token "avt" in name AND token "f2j" in model -> MATCHES!
          const allTokensCondition = {
            AND: tokens.map((token) => fieldMatch(token)),
          };

          // Also allow full rawSearch string match as an alternative fallback
          andConditions.push({
            OR: [
              allTokensCondition,
              fieldMatch(rawSearch),
            ],
          });
        }
      }
    }

    if (status && status !== 'ALL') {
      if (status === 'IN_STOCK') {
        where.status = { in: ['IN_WAREHOUSE', 'IN_STORE'] };
      } else if (status === 'DEFECTIVE') {
        andConditions.push({
          OR: [
            { status: 'DEFECTIVE' },
            { defectiveQuantity: { gt: 0 } },
          ],
        });
      }
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const total = await this.prisma.product.count({ where });

    const products = await this.prisma.product.findMany({
      where,
      include: { category: true, branch: true },
      orderBy: [{ name: 'asc' }, { id: 'desc' }],
      ...(page && limit ? { skip: (page - 1) * limit, take: limit } : {}),
    });

    // Get all product names in the current result set
    const productNames = Array.from(new Set(products.map(p => p.name).filter(Boolean)));
    
    // Find all IDs of products sharing these names (to aggregate across branches/IDs)
    const allRelatedProducts = await this.prisma.product.findMany({
      where: { name: { in: productNames } },
      select: { id: true, name: true }
    });
    
    const relatedIds = allRelatedProducts.map(p => p.id);
    const idToNameMap = new Map(allRelatedProducts.map(p => [p.id, p.name]));

    // Get sold counts for all related product IDs
    // We include only transaction types SALE and DELIVERY, and EXCEPT CANCELLED to get the actual sold count
    const soldCounts = await this.prisma.transactionItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: relatedIds },
        transaction: {
          type: { in: ['SALE', 'DELIVERY'] },
          status: { not: 'CANCELLED' }
        }
      },
      _sum: {
        quantity: true
      }
    });

    // Aggregate totals by NAME
    const nameToSoldMap = new Map<string, number>();
    const individualSalesMap = new Map<number, number>();
    
    soldCounts.forEach(item => {
      if (item.productId) {
        const name = idToNameMap.get(item.productId);
        const qty = item._sum.quantity || 0;
        
        if (name) {
          nameToSoldMap.set(name, (nameToSoldMap.get(name) || 0) + qty);
        }
        individualSalesMap.set(item.productId, (individualSalesMap.get(item.productId) || 0) + qty);
      }
    });

    // Get exchange rate once to avoid thousands of DB calls
    const exchangeRate = await this.currencyExchangeRateService.getCurrentRate('USD', 'UZS');


    // Efficient local enrichment
    const enrichedProducts = products.map((product) => {
      const priceInSom = Math.round(product.price * exchangeRate);
      const marketPriceInSom = product.marketPrice ? Math.round(product.marketPrice * exchangeRate) : null;

      return {
        ...product,
        priceInSom,
        marketPriceInSom,
        priceInDollar: product.price,
        trueSoldCount: nameToSoldMap.get(product.name) || 0,
        individualSoldCount: individualSalesMap.get(product.id) || 0,
      };
    });

    // Apply SOLD filter if requested
    let finalProducts = enrichedProducts;
    if (status === 'SOLD') {
      finalProducts = enrichedProducts.filter(p => p.individualSoldCount > 0);
    }

    if (page && limit) {
      // Calculate global summary for the entire filtered set (for the summary cards)
      const allProductsForSummary = await this.prisma.product.findMany({
        where,
        select: {
          price: true,
          marketPrice: true,
          quantity: true,
          bonusPercentage: true,
        }
      });

      let totalPrice = 0;
      let totalMarketPrice = 0;
      let totalBonus = 0;
      let totalRemaining = 0;

      allProductsForSummary.forEach(p => {
        const qty = p.quantity || 0;
        totalRemaining += qty;
        totalPrice += (p.price || 0) * qty;
        totalMarketPrice += (p.marketPrice || 0) * qty;
        totalBonus += (p.bonusPercentage || 0);
      });

      const globalSold = await this.prisma.transactionItem.aggregate({
        where: {
          product: where,
          transaction: {
            status: { not: 'CANCELLED' }
          }
        },
        _sum: {
          quantity: true
        }
      });

      return {
        data: finalProducts,
        total,
        page,
        limit,
        summary: {
          totalRemaining,
          totalProducts: total,
          totalSold: globalSold._sum.quantity || 0,
          totalPrice,
          totalMarketPrice,
          averageBonusPercentage: allProductsForSummary.length > 0 ? totalBonus / allProductsForSummary.length : 0
        }
      };
    }

    return finalProducts;
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        branch: true,
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi');
    }
    
    // Convert price to som for display
    const priceInSom = await this.currencyExchangeRateService.convertCurrency(
      product.price,
      'USD',
      'UZS',
      product.branchId,
    );

    return {
      ...product,
      priceInSom,
      priceInDollar: product.price,
    };
  }

  async findOneByBranch(id: number, branchId: number) {
    const product = await this.prisma.product.findFirst({
      where: { 
        id,
        branchId 
      },
      include: {
        branch: true,
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi');
    }
    
    // Convert price to som for display
    const priceInSom = await this.currencyExchangeRateService.convertCurrency(
      product.price,
      'USD',
      'UZS',
      product.branchId,
    );

    return {
      ...product,
      priceInSom,
      priceInDollar: product.price,
    };
  }

async update(
  id: number,
  updateProductDto: UpdateProductDto,
  userId: number,
  prismaClient: PrismaClient | Prisma.TransactionClient = this.prisma,
) {
  if (userId) {
    const user = await prismaClient.user.findUnique({ where: { id: userId } });
    if (user && user.role !== 'ADMIN') {
      const setting = await this.prisma.systemSetting.findUnique({ where: { id: 1 } });
      if (setting && !setting.skladAllowEdit) {
        throw new ForbiddenException('Складчиларга маҳсулотларни таҳрирлаш рухсати ўчирилган.');
      }
    }
  }

  const product = await prismaClient.product.findUnique({ where: { id } });
  if (!product) {
    throw new NotFoundException('Mahsulot topilmadi');
  }

  // Check if price, marketPrice or bonusPercentage is being updated
  const isPriceUpdated = updateProductDto.price !== undefined && updateProductDto.price !== product.price;
  const isMarketPriceUpdated = updateProductDto.marketPrice !== undefined && updateProductDto.marketPrice !== product.marketPrice;
  const isBonusUpdated = updateProductDto.bonusPercentage !== undefined && updateProductDto.bonusPercentage !== product.bonusPercentage;

  const updatedProduct = await prismaClient.product.update({
    where: { id },
    data: {
      name: updateProductDto.name,
      categoryId: updateProductDto.categoryId,
      branchId: updateProductDto.branchId,
      price: updateProductDto.price,
      marketPrice: updateProductDto.marketPrice,
      model: updateProductDto.model,
      months: updateProductDto.months,
      status: updateProductDto.status,
      quantity: updateProductDto.quantity,
      bonusPercentage: updateProductDto.bonusPercentage,
    },
  });

  // If price, marketPrice or bonusPercentage is updated, sync with all products having same name and model
  if ((isPriceUpdated || isMarketPriceUpdated || isBonusUpdated) && updatedProduct.name && updatedProduct.model) {
    const updateData: any = {};
    if (isPriceUpdated) {
      updateData.price = updatedProduct.price;
    }
    if (isMarketPriceUpdated) {
      updateData.marketPrice = updatedProduct.marketPrice;
    }
    if (isBonusUpdated) {
      updateData.bonusPercentage = updatedProduct.bonusPercentage;
    }

    // Update all products with same name and model across all branches
    await prismaClient.product.updateMany({
      where: {
        name: updatedProduct.name,
        model: updatedProduct.model,
        id: { not: id }, // Exclude the current product
      },
      data: updateData,
    });
  }

  // Convert price to som for display
  const priceInSom = await this.currencyExchangeRateService.convertCurrency(
    updatedProduct.price,
    'USD',
    'UZS',
    updatedProduct.branchId,
  );

  // Log update history
  try {
    const changes: string[] = [];
    if (updateProductDto.name && updateProductDto.name !== product.name) {
      changes.push(`Nomi: "${product.name}" ➔ "${updateProductDto.name}"`);
    }
    if (updateProductDto.model !== undefined && updateProductDto.model !== product.model) {
      changes.push(`Model: "${product.model || '—'}" ➔ "${updateProductDto.model || '—'}"`);
    }
    if (updateProductDto.price !== undefined && updateProductDto.price !== product.price) {
      changes.push(`Sotish narxi: $${product.price} ➔ $${updateProductDto.price}`);
    }
    if (updateProductDto.marketPrice !== undefined && updateProductDto.marketPrice !== product.marketPrice) {
      changes.push(`Kirim narxi: $${product.marketPrice || 0} ➔ $${updateProductDto.marketPrice}`);
    }
    if (updateProductDto.quantity !== undefined && updateProductDto.quantity !== product.quantity) {
      changes.push(`Miqdori: ${product.quantity} dona ➔ ${updateProductDto.quantity} dona`);
    }
    if (updateProductDto.bonusPercentage !== undefined && updateProductDto.bonusPercentage !== product.bonusPercentage) {
      changes.push(`Bonus foizi: ${product.bonusPercentage || 0}% ➔ ${updateProductDto.bonusPercentage}%`);
    }
    if (updateProductDto.status && updateProductDto.status !== product.status) {
      changes.push(`Holati: "${product.status}" ➔ "${updateProductDto.status}"`);
    }

    const desc = changes.length > 0
      ? `Tovar ma'lumotlari tahrirlandi:\n• ` + changes.join('\n• ')
      : `Tovar tahrirlandi`;

    const qtyDiff = updateProductDto.quantity !== undefined ? updateProductDto.quantity - product.quantity : 0;
    const priceDiff = updateProductDto.price !== undefined ? updateProductDto.price - product.price : 0;

    await this.historyService.createLog({
      productId: id,
      actionType: 'UPDATED',
      performedById: userId,
      description: desc,
      oldValues: {
        name: product.name,
        model: product.model,
        price: product.price,
        marketPrice: product.marketPrice,
        quantity: product.quantity,
        bonusPercentage: product.bonusPercentage,
        status: product.status,
      },
      newValues: {
        name: updatedProduct.name,
        model: updatedProduct.model,
        price: updatedProduct.price,
        marketPrice: updatedProduct.marketPrice,
        quantity: updatedProduct.quantity,
        bonusPercentage: updatedProduct.bonusPercentage,
        status: updatedProduct.status,
      },
      quantityChange: qtyDiff,
      priceChange: priceDiff,
    });
  } catch (err) {
    console.error('Error logging UPDATED product history:', err);
  }

  return {
    ...updatedProduct,
    priceInSom,
    priceInDollar: updatedProduct.price,
  };
}

  // Mahsulotni DEFECTIVE qilib belgilash (to'liq mahsulot
  async markAsDefective(id: number, description: string, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException('Mahsulot topilmadi');
      }

      if (product.quantity === 0) {
        throw new BadRequestException('Mahsulot miqdori 0 ga teng, defective qilib bo\'lmaydi');
      }

      const defectiveQty = product.quantity;

      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          status: 'DEFECTIVE',
          defectiveQuantity: (product.defectiveQuantity || 0) + defectiveQty,
          quantity: 0,
        },
      });

      await tx.defectiveLog.create({
        data: {
          productId: id,
          quantity: defectiveQty,
          description,
          userId,
        },
      });

      const transDesc = `Mahsulot to'liq defective qilib belgilandi. ${defectiveQty} ta. Sababi: ${description}`;

      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'WRITE_OFF',
          status: 'COMPLETED',
          discount: 0,
          total: 0,
          finalTotal: 0,
          amountPaid: 0,
          remainingBalance: 0,
          description: transDesc,
        },
      });

      await tx.transactionItem.create({
        data: {
          transactionId: transaction.id,
          productId: id,
          quantity: defectiveQty,
          price: 0,
          total: 0,
        },
      });

      return updatedProduct;
    });
  }

  // Mahsulotdan ma'lum miqdorini DEFECTIVE qilib belgilash
  async markPartialDefective(id: number, defectiveCount: number, description: string, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException('Mahsulot topilmadi');
      }

      if (defectiveCount <= 0) {
        throw new BadRequestException('Defective miqdor 0 dan katta bo\'lishi kerak');
      }

      if (defectiveCount > product.quantity) {
        throw new BadRequestException('Defective miqdor mavjud mahsulot miqdoridan ko\'p bo\'lishi mumkin emas');
      }

      const newQuantity = product.quantity - defectiveCount;
      const newDefectiveQuantity = (product.defectiveQuantity || 0) + defectiveCount;

      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          quantity: newQuantity,
          defectiveQuantity: newDefectiveQuantity,
          status: newQuantity === 0 ? 'DEFECTIVE' : product.status,
        },
      });

      await tx.defectiveLog.create({
        data: {
          productId: id,
          quantity: defectiveCount,
          description,
          userId,
        },
      });

      const transDesc = `${defectiveCount} ta mahsulot defective qilib belgilandi. Sababi: ${description}`;

      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'WRITE_OFF',
          status: 'COMPLETED',
          discount: 0,
          total: 0,
          finalTotal: 0,
          amountPaid: 0,
          remainingBalance: 0,
          description: transDesc,
        },
      });

      await tx.transactionItem.create({
        data: {
          transactionId: transaction.id,
          productId: id,
          quantity: defectiveCount,
          price: 0,
          total: 0,
        },
      });

      return updatedProduct;
    });
  }

  // Defective mahsulotlarni qaytarish (restore)
  async restoreDefectiveProduct(id: number, restoreCount: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException('Mahsulot topilmadi');
      }

      if (!product.defectiveQuantity || product.defectiveQuantity === 0) {
        throw new BadRequestException('Bu mahsulotda defective miqdor mavjud emas');
      }

      if (restoreCount <= 0) {
        throw new BadRequestException('Qaytarish miqdori 0 dan katta bo\'lishi kerak');
      }

      if (restoreCount > product.defectiveQuantity) {
        throw new BadRequestException('Qaytarish miqdori defective miqdoridan ko\'p bo\'lishi mumkin emas');
      }

      const newQuantity = product.quantity + restoreCount;
      const newDefectiveQuantity = product.defectiveQuantity - restoreCount;

      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          quantity: newQuantity,
          defectiveQuantity: newDefectiveQuantity,
          status: newDefectiveQuantity === 0 ? 'FIXED' : product.status,
        },
      });

      const transDesc = `${restoreCount} ta defective mahsulot qaytarildi`;

      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'RETURN',
          status: 'COMPLETED',
          discount: 0,
          total: 0,
          finalTotal: 0,
          amountPaid: 0,
          remainingBalance: 0,
          description: transDesc,
        },
      });

      await tx.transactionItem.create({
        data: {
          transactionId: transaction.id,
          productId: id,
          quantity: restoreCount,
          price: 0,
          total: 0,
        },
      });

      return updatedProduct;
    });
  }

  // Bulk defective (to'liq defective qilish bir necha mahsulot uchun)
  async bulkMarkDefective(ids: number[], description: string, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: ids } } });
      if (products.length !== ids.length) {
        throw new NotFoundException('Ba\'zi mahsulotlar topilmadi');
      }

      for (const product of products) {
        if (product.quantity === 0) {
          continue; // Skip if no quantity
        }

        const defectiveQty = product.quantity;

        await tx.product.update({
          where: { id: product.id },
          data: {
            status: 'DEFECTIVE',
            defectiveQuantity: defectiveQty,
            quantity: 0,
          },
        });

        await tx.defectiveLog.create({
          data: {
            productId: product.id,
            quantity: defectiveQty,
            description,
            userId,
          },
        });

        const transDesc = `Bulk: Mahsulot to'liq defective qilib belgilandi. ${defectiveQty} ta. Sababi: ${description}`;

        const transaction = await tx.transaction.create({
          data: {
            userId,
            type: 'WRITE_OFF',
            status: 'COMPLETED',
            discount: 0,
            total: 0,
            finalTotal: 0,
            amountPaid: 0,
            remainingBalance: 0,
            description: transDesc,
          },
        });

        await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: product.id,
            quantity: defectiveQty,
            price: 0,
            total: 0,
          },
        });
      }

      return { message: 'Tanlangan mahsulotlar defective qilindi', count: ids.length };
    });
  }

  // Bulk restore defective (to'liq restore qilish bir necha mahsulot uchun)
  async bulkRestoreDefective(ids: number[], userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: ids } } });
      if (products.length !== ids.length) {
        throw new NotFoundException('Ba\'zi mahsulotlar topilmadi');
      }

      for (const product of products) {
        if (!product.defectiveQuantity || product.defectiveQuantity === 0) {
          continue; // Skip if no defective quantity
        }

        const restoreCount = product.defectiveQuantity;
        const newQuantity = product.quantity + restoreCount;
        const newDefectiveQuantity = 0;

        await tx.product.update({
          where: { id: product.id },
          data: {
            quantity: newQuantity,
            defectiveQuantity: newDefectiveQuantity,
            status: 'FIXED',
          },
        });

        const transDesc = `Bulk: ${restoreCount} ta defective mahsulot qaytarildi`;

        const transaction = await tx.transaction.create({
          data: {
            userId,
            type: 'RETURN',
            status: 'COMPLETED',
            discount: 0,
            total: 0,
            finalTotal: 0,
            amountPaid: 0,
            remainingBalance: 0,
            description: transDesc,
          },
        });

        await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: product.id,
            quantity: restoreCount,
            price: 0,
            total: 0,
          },
        });
      }

      return { message: 'Tanlangan defective mahsulotlar qaytarildi', count: ids.length };
    });
  }

  // Defective mahsulotlar ro'yxati
  async getDefectiveProducts(branchId?: number) {
    const where: Prisma.ProductWhereInput = {
      defectiveQuantity: { gt: 0 },
    };

    if (branchId) {
      where.branchId = branchId;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        branch: true,
      },
      orderBy: { id: 'asc' },
    });

    // Convert prices to som for display
    const productsWithSomPrices = await Promise.all(
      products.map(async (product) => {
        const priceInSom = await this.currencyExchangeRateService.convertCurrency(
          product.price,
          'USD',
          'UZS',
          product.branchId,
        );
        return {
          ...product,
          priceInSom,
          priceInDollar: product.price,
        };
      }),
    );

    return productsWithSomPrices;
  }

  // Fixed mahsulotlar ro'yxati
  async getFixedProducts(branchId?: number) {
    const where: Prisma.ProductWhereInput = {
      status: 'FIXED',
    };

    if (branchId) {
      where.branchId = branchId;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        branch: true,
      },
      orderBy: { id: 'asc' },
    });

    // Convert prices to som for display
    const productsWithSomPrices = await Promise.all(
      products.map(async (product) => {
        const priceInSom = await this.currencyExchangeRateService.convertCurrency(
          product.price,
          'USD',
          'UZS',
          product.branchId,
        );
        return {
          ...product,
          priceInSom,
          priceInDollar: product.price,
        };
      }),
    );

    return productsWithSomPrices;
  }

async remove(id: number, userId: number) {
  if (userId) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && user.role !== 'ADMIN') {
      const setting = await this.prisma.systemSetting.findUnique({ where: { id: 1 } });
      if (setting && !setting.skladAllowDelete) {
        throw new ForbiddenException('Складчиларга маҳсулотларни ўчириш рухсати ўчирилган.');
      }
    }
  }
  return this.prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi');
    }

    if (product.isDeleted) {
      return product;
    }

    const deletedProduct = await tx.product.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        quantity: 0,
      },
    });

    try {
      await this.historyService.createLog({
        productId: id,
        actionType: 'DELETED',
        performedById: userId,
        description: `Tovar o'chirildi (Soft Delete): "${product.name}"${product.model ? ` (${product.model})` : ''}. Oldingi qoldiq: ${product.quantity} dona.`,
        oldValues: { name: product.name, model: product.model, quantity: product.quantity, price: product.price },
        quantityChange: -product.quantity,
      });
    } catch (err) {
      console.error('Error logging DELETED product history:', err);
    }

    return deletedProduct;
  });
}


  async uploadExcel(file: Express.Multer.File, fromBranchId: number, categoryId: number, status: string, userId: number) {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: { [key: string]: any }[] = XLSX.utils.sheet_to_json(worksheet);

return this.prisma.$transaction(async (tx) => {
  for (const row of data) {
    let barcode = row['barcode'] ? String(row['barcode']) : null;
    if (!barcode) {
      barcode = await this.generateUniqueBarcode(tx);
    }

    const createProductDto: CreateProductDto = {
      barcode: barcode,
      name: String(row['name'] || ''),
      quantity: Number(row['quantity']) || 0,
      price: Number(row['price']) || 0,
      marketPrice: row['marketPrice'] ? Number(row['marketPrice']) : undefined,
      model: row['model'] ? String(row['model']) : undefined,
      months: row['months'] ? String(row['months']) : undefined,
      description: row['description'] ? String(row['description']) : undefined,
      branchId: fromBranchId,
      categoryId: categoryId,
      status: (status || 'IN_STORE') as ProductStatus,
      bonusPercentage: row['bonusPercentage'] ? Number(row['bonusPercentage']) : 0,
    };

    const existing = await tx.product.findUnique({
      where: {
        barcode_branchId: {
          barcode,
          branchId: fromBranchId,
        },
      },
    });

    if (existing) {
      const newQuantity = existing.quantity + createProductDto.quantity;
      const updateDto: UpdateProductDto = {
        ...createProductDto,
        quantity: newQuantity,
      };
      await this.update(existing.id, updateDto, userId, tx); // ✅ tx uzatyapmiz
    } else {
      await this.create(createProductDto, userId, tx); // ✅ tx uzatyapmiz
    }
  }

  return { message: 'Mahsulotlar muvaffaqiyatli yuklandi' };
});

    } catch (error) {
      throw new BadRequestException('Excel faylini o\'qishda xatolik: ' + error.message);
    }
  }

  async removeMany(ids: number[], userId?: number) {
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && user.role !== 'ADMIN') {
        const setting = await this.prisma.systemSetting.findUnique({ where: { id: 1 } });
        if (setting && !setting.skladAllowDelete) {
          throw new ForbiddenException('Складчиларга маҳсулотларни ўчириш рухсати ўчирилган.');
        }
      }
    }
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
    });

    if (products.length !== ids.length) {
      throw new NotFoundException("Ba'zi mahsulotlar topilmadi");
    }

    const deleted = await this.prisma.product.updateMany({
      where: {
        id: { in: ids },
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        quantity: 0,
      },
    });
    return {
      message: "Mahsulotlar muvaffaqiyatli o'chirildi",
      count: deleted.count,
    };
  }

  async getPriceInSom(productId: number, branchId?: number) {
    const product = branchId 
      ? await this.findOneByBranch(productId, branchId)
      : await this.findOne(productId);
      
    if (!product) return null;

    return {
      priceInDollar: product.price,
      priceInSom: product.priceInSom,
    };
  }

  async getPriceInDollar(productId: number, branchId?: number) {
    const product = branchId 
      ? await this.findOneByBranch(productId, branchId)
      : await this.findOne(productId);
      
    if (!product) return null;

    return {
      priceInDollar: product.price,
      priceInSom: product.priceInSom,
    };
  }

  async checkTransferMatches(toBranchId: number, items: any[]) {
    const results: any[] = [];
    for (const item of items) {
      const { productId, name, model, barcode } = item;
      
      // Find source product if productId is provided
      let sourceProduct: any = null;
      if (productId) {
        sourceProduct = await this.prisma.product.findUnique({
          where: { id: productId }
        });
      }

      let targetProduct: any = null;
      const actualBarcode = barcode || sourceProduct?.barcode;

      // Find by barcode
      if (actualBarcode) {
        targetProduct = await this.prisma.product.findFirst({
          where: { barcode: actualBarcode, branchId: toBranchId, isDeleted: false }
        });
      }

      // Fallback: Find by name and model matching
      if (!targetProduct) {
        const actualName = name || sourceProduct?.name;
        const actualModel = model || sourceProduct?.model || '';
        
        if (actualName) {
          const searchConditions: any = {
            AND: [
              {
                OR: [
                  { name: { equals: actualName, mode: 'insensitive' } },
                  { name: { contains: actualName, mode: 'insensitive' } },
                  { name: { contains: actualName.trim(), mode: 'insensitive' } }
                ]
              },
              { branchId: toBranchId, isDeleted: false }
            ]
          };

          if (actualModel && actualModel.trim()) {
            searchConditions.AND.push({
              OR: [
                { model: { equals: actualModel, mode: 'insensitive' } },
                { model: { contains: actualModel, mode: 'insensitive' } },
                { model: { contains: actualModel.trim(), mode: 'insensitive' } }
              ]
            });
          } else {
            searchConditions.AND.push({
              OR: [
                { model: null },
                { model: '' },
                { model: { equals: '', mode: 'insensitive' } }
              ]
            });
          }

          targetProduct = await this.prisma.product.findFirst({ where: searchConditions });
        }
      }

      results.push({
        productId,
        name: name || sourceProduct?.name,
        model: model || sourceProduct?.model,
        barcode: actualBarcode,
        exists: !!targetProduct,
        targetProduct: targetProduct ? {
          id: targetProduct.id,
          name: targetProduct.name,
          model: targetProduct.model,
          barcode: targetProduct.barcode,
          quantity: targetProduct.quantity,
          branchId: targetProduct.branchId
        } : null
      });
    }

    return results;
  }

  async getBonusPercentages(branchId?: number) {
    const where: any = { isDeleted: false };
    if (branchId) where.branchId = branchId;

    const products = await this.prisma.product.findMany({
      where,
      select: { bonusPercentage: true },
      distinct: ['bonusPercentage'],
    });

    const bonuses = new Set<number>();
    products.forEach((p) => {
      if (p.bonusPercentage !== null && p.bonusPercentage !== undefined) {
        const b = Number(p.bonusPercentage) || 0;
        if (!isNaN(b) && b >= 0) {
          bonuses.add(Math.round(b * 100) / 100);
        }
      }
    });

    return Array.from(bonuses).sort((a, b) => a - b);
  }
}