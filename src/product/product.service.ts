// product.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto, userId?: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: createProductDto.name,
          barcode: createProductDto.barcode,
          description: createProductDto.description,
          categoryId: createProductDto.categoryId,
          branchId: createProductDto.branchId,
          price: createProductDto.price,
          marketPrice: createProductDto.marketPrice,
          model: createProductDto.model,
          initialQuantity: createProductDto.quantity,
          quantity: createProductDto.quantity,
          status: createProductDto.status || 'IN_STORE',
        },
      });

      if (createProductDto.quantity && createProductDto.quantity > 0) {
        await tx.productStockHistory.create({
          data: {
            productId: product.id,
            branchId: createProductDto.branchId,
            quantity: createProductDto.quantity,
            type: 'INFLOW',
            description: 'Initial stock for product creation',
            createdById: userId ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
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

  async update(id: number, updateProductDto: UpdateProductDto, userId?: number) {
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
        await tx.productStockHistory.create({
          data: {
            productId: id,
            branchId: product.branchId,
            quantity: quantityDifference,
            type: 'ADJUSTMENT',
            description: `Stock adjustment from ${product.quantity} to ${updateProductDto.quantity}`,
            createdById: userId ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      return updatedProduct;
    });
  }

  async remove(id: number, userId?: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException('Mahsulot topilmadi');
      }

      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          status: 'DEFECTIVE',
          quantity: 0,
        },
      });

      if (product.quantity > 0) {
        await tx.productStockHistory.create({
          data: {
            productId: id,
            branchId: product.branchId,
            quantity: -product.quantity,
            type: 'ADJUSTMENT',
            description: 'Stock set to 0 due to defective status',
            createdById: userId ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      return updatedProduct;
    });
  }

  async uploadExcel(file: Express.Multer.File, branchId: number, categoryId: number, status: string, userId?: number) {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      for (const row of data) {
        const createProductDto: CreateProductDto = {
          barcode: row['barcode'],
          name: row['name'],
          quantity: Number(row['quantity']) || 0,
          price: Number(row['price']) || 0,
          marketPrice: row['marketPrice'] ? Number(row['marketPrice']) : undefined,
          model: row['model'],
          description: row['description'],
          branchId: branchId,
          categoryId: categoryId,
          status: status as any, // Assuming status is a valid ProductStatus enum value
        };
        await this.create(createProductDto, userId);
      }
      return { message: 'Mahsulotlar muvaffaqiyatli yuklandi' };
    } catch (error) {
      throw new BadRequestException('Excel faylini o\'qishda xatolik: ' + error.message);
    }
  }
}