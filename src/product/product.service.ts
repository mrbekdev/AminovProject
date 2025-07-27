import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductStatus } from '@prisma/client';
import * as XLSX from 'xlsx';

interface ExcelRow {
  name?: string;
  barcode?: string;
  description?: string;
  categoryId?: string | number;
  branchId?: string | number;
  status?: string;
  price?: string | number;
  marketPrice?: string | number;
  model?: string;
  quantity?: string | number;
}

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

  async uploadExcel(file: Express.Multer.File) {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);

      const products = await this.prisma.$transaction(async (tx) => {
        const createdProducts: Product[] = [];

        for (const row of data) {
          const productData: CreateProductDto = {
            name: row.name?.toString() || '',
            barcode: row.barcode?.toString() || '',
            description: row.description?.toString() || '',
            categoryId: row.categoryId ? parseInt(row.categoryId.toString()) : 1,
            branchId: row.branchId ? parseInt(row.branchId.toString()) : 1,
            status: row.status as ProductStatus,
            price: row.price ? parseFloat(row.price.toString()) : 1,
            marketPrice: row.marketPrice ? parseFloat(row.marketPrice.toString()) : 1,
            model: row.model?.toString() || '',
            quantity: row.quantity ? parseInt(row.quantity.toString()) : 0,
          };

          if (!productData.name || !productData.barcode || !productData.categoryId || !productData.branchId || !productData.status || !productData.price) {
            throw new HttpException(`Invalid data in row: ${JSON.stringify(row)}`, HttpStatus.BAD_REQUEST);
          }

          if (!Object.values(ProductStatus).includes(productData.status)) {
            throw new HttpException(`Invalid status in row: ${productData.status}`, HttpStatus.BAD_REQUEST);
          }

          const existingProduct = await tx.product.findUnique({
            where: { barcode: productData.barcode },
          });

          if (existingProduct) {
            throw new HttpException(`Duplicate barcode: ${productData.barcode}`, HttpStatus.BAD_REQUEST);
          }

          const product = await tx.product.create({
            data: {
              ...productData,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          createdProducts.push(product);
        }

        return createdProducts;
      });

      return {
        message: 'Products uploaded successfully',
        count: products.length,
        products,
      };
    } catch (error) {
      throw new HttpException(`Failed to process Excel file: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        branch: true,
      },
    });
    if (!product) throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    return product;
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
        branch: true,
      },
    });
    if (!product) throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    return product;
  }

  async findAll(branchId?: number) {
    return this.prisma.product.findMany({
      where: {
        branchId: branchId ? parseInt(branchId.toString()) : undefined,
      },
      include: {
        category: true,
      },
    });
  }

  async update(id: number, updateProductDto: UpdateProductDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) throw new HttpException('Product not found', HttpStatus.NOT_FOUND);

      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          ...updateProductDto,
          updatedAt: new Date(),
        },
      });

      if (updateProductDto.quantity !== undefined && updateProductDto.quantity !== product.quantity) {
        await tx.productStockHistory.create({
          data: {
            productId: id,
            branchId: product.branchId,
            quantity: updateProductDto.quantity - product.quantity,
            type: updateProductDto.quantity > product.quantity ? 'INFLOW' : 'OUTFLOW',
            description: `Quantity updated to ${updateProductDto.quantity} via sales`,
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      return updatedProduct;
    });
  }

  async remove(id: number) {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}