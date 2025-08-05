
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductStatus, StockHistoryType } from '@prisma/client';
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

  async create(createProductDto: CreateProductDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const { quantity, ...rest } = createProductDto;
      const product = await tx.product.create({
        data: {
          ...rest,
          initialQuantity: quantity || 0,
          quantity: quantity || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      if (quantity && quantity > 0) {
        await tx.productStockHistory.create({
          data: {
            productId: product.id,
            branchId: product.branchId,
            quantity,
            type: StockHistoryType.INFLOW,
            description: 'Initial stock for product creation',
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      return product;
    });
  }

  async uploadExcel(file: Express.Multer.File, userId: number) {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);

      const products = await this.prisma.$transaction(async (tx) => {
        const createdProducts: Product[] = [];

        for (const row of data) {
          // Validate and parse required fields immediately
          if (!row.name || !row.barcode || !row.categoryId || !row.branchId || !row.price) {
            throw new HttpException(`Missing required fields in row: ${JSON.stringify(row)}`, HttpStatus.BAD_REQUEST);
          }

          const categoryId = parseInt(row.categoryId.toString());
          const branchId = parseInt(row.branchId.toString());
          const price = parseFloat(row.price.toString());
          const quantity = row.quantity ? parseInt(row.quantity.toString()) : 0;
          const marketPrice = row.marketPrice ? parseFloat(row.marketPrice.toString()) : undefined;

          // Validate parsed numbers
          if (isNaN(categoryId) || isNaN(branchId) || isNaN(price)) {
            throw new HttpException(`Invalid numeric values in row: ${JSON.stringify(row)}`, HttpStatus.BAD_REQUEST);
          }

          const productData: CreateProductDto = {
            name: row.name.toString(),
            barcode: row.barcode.toString(),
            description: row.description?.toString() || undefined,
            categoryId,
            branchId,
            status: (row.status as ProductStatus) || ProductStatus.IN_WAREHOUSE,
            price,
            marketPrice,
            model: row.model?.toString() || undefined,
            quantity,
          };

          if (!Object.values(ProductStatus).includes(productData.status)) {
            throw new HttpException(`Invalid status: ${productData.status}`, HttpStatus.BAD_REQUEST);
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
              initialQuantity: productData.quantity,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          if (productData.quantity > 0) {
            await tx.productStockHistory.create({
              data: {
                productId: product.id,
                branchId: product.branchId,
                quantity: productData.quantity,
                type: StockHistoryType.INFLOW,
                description: 'Initial stock from Excel upload',
                createdById: userId,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });
          }

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
        stockHistory: {
          select: {
            quantity: true,
            type: true,
            description: true,
            createdAt: true,
            createdBy: { select: { name: true } },
          },
        },
      },
    });
    if (!product) throw new HttpException('Product not found', HttpStatus.NOT_FOUND);

    const stockSummary = product.stockHistory.reduce(
      (acc, entry) => {
        if (entry.type === StockHistoryType.INFLOW) acc.inflow += entry.quantity;
        if (entry.type === StockHistoryType.OUTFLOW) acc.outflow += entry.quantity;
        if (entry.type === StockHistoryType.RETURN) acc.returns += entry.quantity;
        if (entry.type === StockHistoryType.ADJUSTMENT) acc.adjustments += entry.quantity;
        return acc;
      },
      { inflow: 0, outflow: 0, returns: 0, adjustments: 0 }
    );

    return { ...product, stockSummary };
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
        branch: true,
        stockHistory: {
          select: {
            quantity: true,
            type: true,
            description: true,
            createdAt: true,
            createdBy: { select: { name: true } },
          },
        },
      },
    });
    if (!product) throw new HttpException('Product not found', HttpStatus.NOT_FOUND);

    const stockSummary = product.stockHistory.reduce(
      (acc, entry) => {
        if (entry.type === StockHistoryType.INFLOW) acc.inflow += entry.quantity;
        if (entry.type === StockHistoryType.OUTFLOW) acc.outflow += entry.quantity;
        if (entry.type === StockHistoryType.RETURN) acc.returns += entry.quantity;
        if (entry.type === StockHistoryType.ADJUSTMENT) acc.adjustments += entry.quantity;
        return acc;
      },
      { inflow: 0, outflow: 0, returns: 0, adjustments: 0 }
    );

    return { ...product, stockSummary };
  }

  async findAll(branchId?: number) {
    return this.prisma.product.findMany({
      where: { branchId },
      include: {
        category: true,
        branch: true,
      },
    });
  }

  async update(id: number, updateProductDto: UpdateProductDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) throw new HttpException('Product not found', HttpStatus.NOT_FOUND);

      const { quantity, ...rest } = updateProductDto;
      const updateData: any = { ...rest, updatedAt: new Date() };

      if (quantity !== undefined && quantity !== product.quantity) {
        const quantityChange = quantity - product.quantity;
        updateData.quantity = quantity;

        await tx.productStockHistory.create({
          data: {
            productId: id,
            branchId: product.branchId,
            quantity: quantityChange,
            type: quantityChange > 0 ? StockHistoryType.INFLOW : StockHistoryType.ADJUSTMENT,
            description: `Quantity updated to ${quantity} via product update`,
            createdById: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      return tx.product.update({
        where: { id },
        data: updateData,
        include: { category: true, branch: true },
      });
    });
  }

  async remove(id: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) throw new HttpException('Product not found', HttpStatus.NOT_FOUND);

      await tx.productStockHistory.create({
        data: {
          productId: id,
          branchId: product.branchId,
          quantity: 0,
          type: StockHistoryType.ADJUSTMENT,
          description: 'Product marked as defective/deleted',
          createdById: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return tx.product.update({
        where: { id },
        data: { status: ProductStatus.DEFECTIVE, updatedAt: new Date() },
      });
    });
  }
}
