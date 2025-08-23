import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma, ProductStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import { CurrencyExchangeRateService } from '../currency-exchange-rate/currency-exchange-rate.service';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private currencyExchangeRateService: CurrencyExchangeRateService,
  ) {}

  async create(createProductDto: CreateProductDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: createProductDto.name,
          barcode: createProductDto.barcode || null,
          categoryId: createProductDto.categoryId,
          branchId: createProductDto.branchId,
          price: createProductDto.price,
          marketPrice: createProductDto.marketPrice,
          model: createProductDto.model,
          initialQuantity: createProductDto.quantity,
          quantity: createProductDto.quantity,
          status: createProductDto.status || 'IN_STORE',
          defectiveQuantity: 0,
        },
      });

      if (createProductDto.quantity && createProductDto.quantity > 0) {
        const transaction = await tx.transaction.create({
          data: {
            userId,
            type: 'PURCHASE',
            status: 'COMPLETED',
            discount: 0,
            total: 0,
            finalTotal: 0,
            amountPaid: 0,
            remainingBalance: 0,
            description: 'Initial stock for product creation',
          },
        });

        await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: product.id,
            quantity: createProductDto.quantity,
            price: 0,
            total: 0,
          },
        });
      }

      return product;
    });
  }

  async findAll(branchId?: number, search?: string, includeZeroQuantity: boolean = false) {
    const where: Prisma.ProductWhereInput = {};
    if (branchId) where.branchId = +branchId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (!includeZeroQuantity) {
      where.quantity = { gt: 0 };
    }
    const products = await this.prisma.product.findMany({
      where,
      include: { category: true, branch: true },
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

  async update(id: number, updateProductDto: UpdateProductDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException('Mahsulot topilmadi');
      }

      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          name: updateProductDto.name,
          barcode: updateProductDto.barcode,
          categoryId: updateProductDto.categoryId,
          branchId: updateProductDto.branchId,
          price: updateProductDto.price,
          marketPrice: updateProductDto.marketPrice,
          model: updateProductDto.model,
          status: updateProductDto.status,
          quantity: updateProductDto.quantity,
        },
      });

      if (
        updateProductDto.quantity !== undefined &&
        updateProductDto.quantity !== product.quantity
      ) {
        const quantityDifference = updateProductDto.quantity - product.quantity;
        const absDiff = Math.abs(quantityDifference);
        const type = quantityDifference > 0 ? 'PURCHASE' : 'WRITE_OFF';
        const itemQuantity = absDiff;

        const transaction = await tx.transaction.create({
          data: {
            userId,
            type,
            status: 'COMPLETED',
            discount: 0,
            total: 0,
            finalTotal: 0,
            amountPaid: 0,
            remainingBalance: 0,
            description: `Stock adjustment from ${product.quantity} to ${updateProductDto.quantity}`,
          },
        });

        await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: id,
            quantity: itemQuantity,
            price: 0,
            total: 0,
          },
        });
      }

      return updatedProduct;
    });
  }

  // Mahsulotni DEFECTIVE qilib belgilash (to'liq mahsulot)
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
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException('Mahsulot topilmadi');
      }

      const updatedProduct = await this.prisma.product.delete({
        where: { id },
      });

      return updatedProduct;
    });
  }

  async uploadExcel(file: Express.Multer.File, fromBranchId: number, categoryId: number, status: string, userId: number) {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: { [key: string]: any }[] = XLSX.utils.sheet_to_json(worksheet);

      for (const row of data) {
        const barcode = row['barcode'] ? String(row['barcode']) : undefined;
        const createProductDto: CreateProductDto = {
          barcode: barcode,
          name: String(row['name'] || ''),
          quantity: Number(row['quantity']) || 0,
          price: Number(row['price']) || 0,
          marketPrice: row['marketPrice'] ? Number(row['marketPrice']) : undefined,
          model: row['model'] ? String(row['model']) : undefined,
          description: row['description'] ? String(row['description']) : undefined,
          branchId: fromBranchId,
          categoryId: categoryId,
          status: (status || 'IN_STORE') as ProductStatus,
        };

        if (barcode) {
          const existing = await this.prisma.product.findUnique({
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
              name: createProductDto.name,
              barcode: createProductDto.barcode,
              categoryId: createProductDto.categoryId,
              branchId: createProductDto.branchId,
              price: createProductDto.price,
              marketPrice: createProductDto.marketPrice,
              model: createProductDto.model,
              status: createProductDto.status,
              quantity: newQuantity,
            };
            await this.update(existing.id, updateDto, userId);
          } else {
            await this.create(createProductDto, userId);
          }
        } else {
          await this.create(createProductDto, userId);
        }
      }
      return { message: 'Mahsulotlar muvaffaqiyatli yuklandi' };
    } catch (error) {
      throw new BadRequestException('Excel faylini o\'qishda xatolik: ' + error.message);
    }
  }

async removeMany(ids: number[],userId:number) {
  const result = await this.prisma.product.deleteMany({
    where: { id: { in: ids } },
  });

  if (result.count !== ids.length) {
    throw new NotFoundException("Ba'zi mahsulotlar topilmadi");
  }

  return {
    message: "Mahsulotlar muvaffaqiyatli o'chirildi",
    count: result.count,
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
}