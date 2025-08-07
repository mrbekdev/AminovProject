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
      const { productId, fromBranchId, toBranchId, quantity, initiatedById } = createProductTransferDto;

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new BadRequestException(`Product with ID ${productId} not found`);
      }

      const fromBranch = await prisma.branch.findUnique({
        where: { id: fromBranchId },
      });
      if (!fromBranch) {
        throw new BadRequestException(`From branch with ID ${fromBranchId} not found`);
      }

      const toBranch = await prisma.branch.findUnique({
        where: { id: toBranchId },
      });
      if (!toBranch) {
        throw new BadRequestException(`To branch with ID ${toBranchId} not found`);
      }

      if (product.quantity < quantity) {
        throw new BadRequestException(`Insufficient stock for product ${product.name}`);
      }

      if (fromBranchId === toBranchId) {
        throw new BadRequestException('Cannot transfer to the same branch');
      }

      const user = await prisma.user.findUnique({
        where: { id: initiatedById },
      });
      if (!user) {
        throw new BadRequestException(`User with ID ${initiatedById} not found`);
      }

      await prisma.product.update({
        where: { id: productId },
        data: {
          quantity: { decrement: quantity },
          branchId: fromBranchId,
        },
      });

      await prisma.product.update({
        where: { id: productId },
        data: {
          quantity: { increment: quantity },
          branchId: toBranchId,
        },
      });

      await prisma.productStockHistory.create({
        data: {
          productId,
          branchId: fromBranchId,
          quantity,
          type: 'TRANSFER_OUT',
          createdById: initiatedById,
          description: `Transfer to branch ${toBranchId}`,
        },
      });

      await prisma.productStockHistory.create({
        data: {
          productId,
          branchId: toBranchId,
          quantity,
          type: 'TRANSFER_IN',
          createdById: initiatedById,
          description: `Transfer from branch ${fromBranchId}`,
        },
      });

      return prisma.productTransfer.create({
        data: {
          productId,
          fromBranchId,
          toBranchId,
          quantity,
          initiatedById,
          transferDate: createProductTransferDto.transferDate || new Date(),
          status: createProductTransferDto.status || 'PENDING',
          notes: createProductTransferDto.notes,
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

    if (!transfer) {
      throw new NotFoundException(`Product transfer with ID ${id} not found`);
    }

    return transfer;
  }

  async update(id: number, updateProductTransferDto: UpdateProductTransferDto): Promise<ProductTransfer> {
    const transfer = await this.prisma.productTransfer.findUnique({
      where: { id },
    });

    if (!transfer) {
      throw new NotFoundException(`Product transfer with ID ${id} not found`);
    }

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
    const transfer = await this.prisma.productTransfer.findUnique({
      where: { id },
    });

    if (!transfer) {
      throw new NotFoundException(`Product transfer with ID ${id} not found`);
    }

    await this.prisma.productTransfer.delete({
      where: { id },
    });
  }

  async getStockReport(branchId: number, startDate?: Date, endDate?: Date) {
    // Validate dates
    const isValidDate = (date: Date | undefined): boolean => {
      return !!date && !isNaN(date.getTime());
    };

    const whereClause: any = { branchId };

    // Check if both dates are valid before comparing
    if (isValidDate(startDate) && isValidDate(endDate) && startDate && endDate) {
      if (startDate > endDate) {
        throw new BadRequestException('startDate cannot be later than endDate');
      }
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}