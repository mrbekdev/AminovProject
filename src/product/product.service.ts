// product.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma, ProductStatus } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: createProductDto.name,
          barcode: createProductDto?.barcode ? createProductDto.barcode : 'Barcode yoq',
          description: createProductDto.description,
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
            branchId: createProductDto.branchId,
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
    return this.prisma.product.findMany({
      where,
      include: { category: true, branch: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, branch: true },
    });
    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi');
    }
    return product;
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: { category: true, branch: true },
    });
    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi');
    }
    return product;
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
          description: updateProductDto.description,
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
            branchId: product.branchId,
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

      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          status: 'DEFECTIVE',
          defectiveQuantity: product.quantity,
          quantity: 0,
        },
      });

      const transDesc = `Mahsulot to'liq defective qilib belgilandi. ${product.quantity} ta. Sababi: ${description}`;

      const transaction = await tx.transaction.create({
        data: {
          userId,
          branchId: product.branchId,
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
          quantity: product.quantity,
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

      const transDesc = `${defectiveCount} ta mahsulot defective qilib belgilandi. Sababi: ${description}`;

      const transaction = await tx.transaction.create({
        data: {
          userId,
          branchId: product.branchId,
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
          status: newDefectiveQuantity === 0 ? 'IN_STORE' : product.status,
        },
      });

      const transDesc = `${restoreCount} ta defective mahsulot qaytarildi`;

      const transaction = await tx.transaction.create({
        data: {
          userId,
          branchId: product.branchId,
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

  // Defective mahsulotlar ro'yxati
  async getDefectiveProducts(branchId?: number) {
    const where: Prisma.ProductWhereInput = {
      defectiveQuantity: { gt: 0 }
    };
    
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.product.findMany({
      where,
      include: { 
        category: true, 
        branch: true 
      },
      orderBy: { id: 'asc' },
    });
  }

  async remove(id: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException('Mahsulot topilmadi');
      }

      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          status: 'DEFECTIVE',
          defectiveQuantity: product.quantity,
          quantity: 0,
        },
      });

      if (product.quantity > 0) {
        const transDesc = 'Mahsulot o\'chirilgani uchun defective qilindi';

        const transaction = await tx.transaction.create({
          data: {
            userId,
            branchId: product.branchId,
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
            quantity: product.quantity,
            price: 0,
            total: 0,
          },
        });
      }

      return updatedProduct;
    });
  }

  async uploadExcel(file: Express.Multer.File, branchId: number, categoryId: number, status: string, userId: number) {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: { [key: string]: any }[] = XLSX.utils.sheet_to_json(worksheet);

      for (const row of data) {
        const createProductDto: CreateProductDto = {
          barcode: String(row['barcode'] || ''),
          name: String(row['name'] || ''),
          quantity: Number(row['quantity']) || 0,
          price: Number(row['price']) || 0,
          marketPrice: row['marketPrice'] ? Number(row['marketPrice']) : undefined,
          model: row['model'] ? String(row['model']) : undefined,
          description: row['description'] ? String(row['description']) : undefined,
          branchId: branchId,
          categoryId: categoryId,
          status: (status || 'IN_STORE') as ProductStatus,
        };
        await this.create(createProductDto, userId);
      }
      return { message: 'Mahsulotlar muvaffaqiyatli yuklandi' };
    } catch (error) {
      throw new BadRequestException('Excel faylini o\'qishda xatolik: ' + error.message);
    }
  }

  async removeMany(ids: number[], userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: ids } },
      });

      if (products.length !== ids.length) {
        throw new NotFoundException('Ba\'zi mahsulotlar topilmadi');
      }

      for (const product of products) {
        await tx.product.update({
          where: { id: product.id },
          data: {
            status: 'DEFECTIVE',
            defectiveQuantity: product.quantity,
            quantity: 0,
          },
        });

        if (product.quantity > 0) {
          const transDesc = 'Mahsulot o\'chirilgani uchun defective qilindi';

          const transaction = await tx.transaction.create({
            data: {
              userId,
              branchId: product.branchId,
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
              quantity: product.quantity,
              price: 0,
              total: 0,
            },
          });
        }
      }

      return { message: 'Mahsulotlar muvaffaqiyatli o\'chirildi', count: ids.length };
    });
  }
}