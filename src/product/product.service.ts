import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '@prisma/client';

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
    if (branchId) where.branchId = branchId;
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

  async uploadExcel(file: Express.Multer.File, userId?: number) {
    throw new Error('Excel yuklash funksiyasi hali implement qilinmagan');
  }
}