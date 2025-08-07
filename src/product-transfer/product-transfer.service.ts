import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductTransferDto, UpdateProductTransferDto } from './dto/create-product-transfer.dto';

@Injectable()
export class ProductTransferService {
  constructor(private prisma: PrismaService) {}

  async create(createProductTransferDto: CreateProductTransferDto) {
    const { productId, fromBranchId, toBranchId, quantity, initiatedById } = createProductTransferDto;

    // Verify product and branches exist
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    const fromBranch = await this.prisma.branch.findUnique({ where: { id: fromBranchId } });
    const toBranch = await this.prisma.branch.findUnique({ where: { id: toBranchId } });
    const user = await this.prisma.user.findUnique({ where: { id: initiatedById } });

    if (!product || !fromBranch || !toBranch || !user) {
      throw new NotFoundException('Product, branch, or user not found');
    }

    // Check if sufficient quantity exists
    if (product.quantity < quantity) {
      throw new BadRequestException('Insufficient product quantity in source branch');
    }

    // Create transfer and update stock
    return this.prisma.$transaction(async (prisma) => {
      const transfer = await prisma.productTransfer.create({
        data: {
          ...createProductTransferDto,
          transferDate: new Date(createProductTransferDto.transferDate),
        },
      });

      // Update product quantity
      await prisma.product.update({
        where: { id: productId },
        data: { quantity: { decrement: quantity } },
      });

      // Record stock history for source branch (outflow)
      await prisma.productStockHistory.create({
        data: {
          productId,
          branchId: fromBranchId,
          quantity: -quantity,
          type: 'TRANSFER_OUT',
          description: `Transfer to branch ${toBranchId}`,
          createdById: initiatedById,
        },
      });

      // Record stock history for destination branch (inflow)
      await prisma.productStockHistory.create({
        data: {
          productId,
          branchId: toBranchId,
          quantity,
          type: 'TRANSFER_IN',
          description: `Transfer from branch ${fromBranchId}`,
          createdById: initiatedById,
        },
      });

      return transfer;
    });
  }

  async findAll() {
    return this.prisma.productTransfer.findMany({
      include: {
        product: true,
        fromBranch: true,
        toBranch: true,
        initiatedBy: true,
      },
    });
  }

  async findOne(id: number) {
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
      throw new NotFoundException('Transfer not found');
    }
    return transfer;
  }

  async update(id: number, updateProductTransferDto: UpdateProductTransferDto) {
    const transfer = await this.prisma.productTransfer.findUnique({ where: { id } });
    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return this.prisma.$transaction(async (prisma) => {
      // If quantity or product changes, update stock history
      if (updateProductTransferDto.quantity && updateProductTransferDto.quantity !== transfer.quantity) {
        const quantityDiff = updateProductTransferDto.quantity - transfer.quantity;

        await prisma.product.update({
          where: { id: transfer.productId },
          data: { quantity: { decrement: quantityDiff } },
        });

        await prisma.productStockHistory.create({
          data: {
            productId: transfer.productId,
            branchId: transfer.fromBranchId,
            quantity: -quantityDiff,
            type: 'TRANSFER_OUT',
            description: `Transfer adjustment for transfer ${id}`,
            createdById: transfer.initiatedById,
          },
        });

        await prisma.productStockHistory.create({
          data: {
            productId: transfer.productId,
            branchId: transfer.toBranchId,
            quantity: quantityDiff,
            type: 'TRANSFER_IN',
            description: `Transfer adjustment for transfer ${id}`,
            createdById: transfer.initiatedById,
          },
        });
      }

      return prisma.productTransfer.update({
        where: { id },
        data: updateProductTransferDto,
      });
    });
  }

  async remove(id: number) {
    const transfer = await this.prisma.productTransfer.findUnique({ where: { id } });
    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return this.prisma.$transaction(async (prisma) => {
      // Reverse the quantity change
      await prisma.product.update({
        where: { id: transfer.productId },
        data: { quantity: { increment: transfer.quantity } },
      });

      // Record reversal in stock history
      await prisma.productStockHistory.create({
        data: {
          productId: transfer.productId,
          branchId: transfer.fromBranchId,
          quantity: transfer.quantity,
          type: 'TRANSFER_OUT',
          description: `Reversal of transfer ${id}`,
          createdById: transfer.initiatedById,
        },
      });

      await prisma.productStockHistory.create({
        data: {
          productId: transfer.productId,
          branchId: transfer.toBranchId,
          quantity: -transfer.quantity,
          type: 'TRANSFER_IN',
          description: `Reversal of transfer ${id}`,
          createdById: transfer.initiatedById,
        },
      });

      return prisma.productTransfer.delete({ where: { id } });
    });
  }

  async getStockReport(branchId: number, startDate: Date, endDate: Date) {
    return this.prisma.productStockHistory.findMany({
      where: {
        branchId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
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