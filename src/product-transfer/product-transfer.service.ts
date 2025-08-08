
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductTransferDto } from './dto/create-product-transfer.dto';
import { UpdateProductTransferDto } from './dto/update-product-transfer.dto';
import { ProductTransfer } from '@prisma/client';

@Injectable()
export class ProductTransferService {
  constructor(private prisma: PrismaService) {}

  async create(createProductTransferDto: CreateProductTransferDto): Promise<ProductTransfer> {
    return this.prisma.$transaction(async (prisma) => {
      const { productId, fromBranchId, toBranchId, quantity, initiatedById, transferDate, status, notes } = createProductTransferDto;

      // Validate fromBranch
      const fromBranch = await prisma.branch.findUnique({ where: { id: fromBranchId } });
      if (!fromBranch) throw new BadRequestException(`From branch with ID ${fromBranchId} not found`);

      // Validate toBranch
      const toBranch = await prisma.branch.findUnique({ where: { id: toBranchId } });
      if (!toBranch) throw new BadRequestException(`To branch with ID ${toBranchId} not found`);

      // Prevent same branch transfer
      if (fromBranchId === toBranchId) throw new BadRequestException('Cannot transfer to the same branch');

      // Validate user
      const user = await prisma.user.findUnique({ where: { id: initiatedById } });
      if (!user) throw new BadRequestException(`User with ID ${initiatedById} not found`);

      // Validate source product
      const sourceProduct = await prisma.product.findFirst({
        where: { id: productId, branchId: fromBranchId },
      });
      if (!sourceProduct) throw new BadRequestException(`Product with ID ${productId} not found in branch ${fromBranchId}`);
      if (sourceProduct.quantity < quantity) {
        throw new BadRequestException(`Insufficient stock: ${sourceProduct.quantity} available, ${quantity} requested`);
      }

      // Decrement quantity in source branch
      await prisma.product.update({
        where: { id: sourceProduct.id },
        data: { quantity: { decrement: quantity } },
      });

      console.log(`TRANSFER: Source Product ${sourceProduct.id}, Old Qty: ${sourceProduct.quantity}, New Qty: ${sourceProduct.quantity - quantity}`);

      // Find or update/create product in destination branch
      let destProduct = await prisma.product.findFirst({
        where: { barcode: sourceProduct.barcode, branchId: toBranchId },
      });

      if (destProduct) {
        // Update existing product in destination branch
        await prisma.product.update({
          where: { id: destProduct.id },
          data: { quantity: { increment: quantity } },
        });
        console.log(`TRANSFER: Dest Product ${destProduct.id}, Old Qty: ${destProduct.quantity}, New Qty: ${destProduct.quantity + quantity}`);
      } else {
        // Create new product in destination branch with unique barcode handling
        try {
          destProduct = await prisma.product.create({
            data: {
              name: sourceProduct.name,
              barcode: sourceProduct.barcode,
              quantity,
              price: sourceProduct.price,
              marketPrice: sourceProduct.marketPrice,
              model: sourceProduct.model,
              description: sourceProduct.description,
              branchId: toBranchId,
              categoryId: sourceProduct.categoryId,
              status: sourceProduct.status || 'IN_STORE',
              initialQuantity: quantity,
            },
          });
          console.log(`TRANSFER: Created Dest Product ${destProduct.id}, Qty: ${quantity}`);
        } catch (error) {
          // Handle P2002 error (unique constraint violation)
          if (error.code === 'P2002' && error.meta?.target?.includes('barcode')) {
            // Try to find the product again in case it was created by another concurrent transaction
            destProduct = await prisma.product.findFirst({
              where: { barcode: sourceProduct.barcode, branchId: toBranchId },
            });
            
            if (destProduct) {
              // Update existing product if found
              await prisma.product.update({
                where: { id: destProduct.id },
                data: { quantity: { increment: quantity } },
              });
              console.log(`TRANSFER: Updated existing Dest Product ${destProduct.id}, Added Qty: ${quantity}`);
            } else {
              // If still not found, the barcode might conflict with another branch
              // Generate a unique barcode for this branch
              const timestamp = Date.now();
              const uniqueBarcode = `${sourceProduct.barcode}_${toBranchId}_${timestamp}`;
              
              destProduct = await prisma.product.create({
                data: {
                  name: sourceProduct.name,
                  barcode: uniqueBarcode,
                  quantity,
                  price: sourceProduct.price,
                  marketPrice: sourceProduct.marketPrice,
                  model: sourceProduct.model,
                  description: sourceProduct.description,
                  branchId: toBranchId,
                  categoryId: sourceProduct.categoryId,
                  status: sourceProduct.status || 'IN_STORE',
                  initialQuantity: quantity,
                },
              });
              console.log(`TRANSFER: Created Dest Product with unique barcode ${destProduct.id}, Qty: ${quantity}`);
            }
          } else {
            throw error; // Re-throw if it's not a barcode constraint error
          }
        }
      }

      // Record stock history for source (OUTFLOW)
      await prisma.productStockHistory.create({
        data: {
          productId: sourceProduct.id,
          branchId: fromBranchId,
          quantity,
          type: 'OUTFLOW',
          createdById: initiatedById,
          description: `Transfer to branch ${toBranchId}`,
          createdAt: transferDate ? new Date(transferDate) : new Date(),
        },
      });

      // Record stock history for destination (INFLOW)
      await prisma.productStockHistory.create({
        data: {
          productId: destProduct.id,
          branchId: toBranchId,
          quantity,
          type: 'INFLOW',
          createdById: initiatedById,
          description: `Transfer from branch ${fromBranchId}`,
          createdAt: transferDate ? new Date(transferDate) : new Date(),
        },
      });

      // Create transfer record
      return prisma.productTransfer.create({
        data: {
          productId,
          fromBranchId,
          toBranchId,
          quantity,
          initiatedById,
          transferDate: transferDate ? new Date(transferDate) : new Date(),
          status: status || 'PENDING',
          notes,
        },
        include: {
          product: true,
          fromBranch: true,
          toBranch: true,
          initiatedBy: true,
        },
      });
    });
  }

  async findAll(): Promise<ProductTransfer[]> {
    return this.prisma.productTransfer.findMany({
      include: {
        product: true,
        fromBranch: true,
        toBranch: true,
        initiatedBy: true,
      },
      orderBy: { transferDate: 'desc' },
    });
  }

  async findOne(id: number): Promise<ProductTransfer> {
    const transfer = await this.prisma.productTransfer.findUnique({
      where: { id },
      include: {
        product: true,
        fromBranch: true,
        toBranch: true,
        initiatedBy: true,
      },
    });
    if (!transfer) throw new NotFoundException(`Product transfer with ID ${id} not found`);
    return transfer;
  }

  async update(id: number, updateProductTransferDto: UpdateProductTransferDto): Promise<ProductTransfer> {
    const transfer = await this.prisma.productTransfer.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException(`Product transfer with ID ${id} not found`);
    
    return this.prisma.productTransfer.update({
      where: { id },
      data: {
        status: updateProductTransferDto.status,
        notes: updateProductTransferDto.notes,
      },
      include: {
        product: true,
        fromBranch: true,
        toBranch: true,
        initiatedBy: true,
      },
    });
  }

  async remove(id: number): Promise<void> {
    const transfer = await this.prisma.productTransfer.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException(`Product transfer with ID ${id} not found`);
    
    await this.prisma.$transaction(async (prisma) => {
      // Delete related stock history records
      await prisma.productStockHistory.deleteMany({ 
        where: { 
          createdAt: transfer.transferDate 
        } 
      });
      
      // Delete the transfer record
      await prisma.productTransfer.delete({ where: { id } });
    });
  }

  async getStockReport(branchId: number, startDate?: Date, endDate?: Date) {
    const isValidDate = (date: Date | undefined): boolean => !!date && !isNaN(date.getTime());
    const whereClause: any = { branchId };
    
    if (isValidDate(startDate) && isValidDate(endDate) && startDate && endDate) {
      if (startDate > endDate) throw new BadRequestException('startDate cannot be later than endDate');
      whereClause.createdAt = { gte: startDate, lte: endDate };
    } else if (isValidDate(startDate) && startDate) {
      whereClause.createdAt = { gte: startDate };
    } else if (isValidDate(endDate) && endDate) {
      whereClause.createdAt = { lte: endDate };
    }
    
    return this.prisma.productStockHistory.findMany({
      where: whereClause,
      include: {
        product: true,
        createdBy: true,
        transaction: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}