import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductStatus } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    return this.prisma.$transaction(async (tx) => {
      return tx.product.create({
        data: {
          ...createProductDto,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    });
  }

  async findOne(id: number) {
    return this.prisma.product.findUnique({
      where: { id },
      include: { category: true, branch: true, transactions: true },
    });
  }

  async findByBarcode(barcode: string) {
    return this.prisma.product.findUnique({
      where: { barcode },
      include: { category: true, branch: true, transactions: true },
    });
  }

  async findAll(skip: number, take: number, filters?: { branchId?: number; categoryId?: number; status?: ProductStatus }) {
    return this.prisma.product.findMany({
      skip,
      take,
      where: filters,
      include: { category: true, branch: true, transactions: true },
    });
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: { ...updateProductDto, updatedAt: new Date() },
    });
  }

  async remove(id: number) {
    return this.prisma.product.delete({ where: { id } });
  }
}