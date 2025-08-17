import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDefectiveLogDto } from './dto/create-defective-log.dto';
import { UpdateDefectiveLogDto } from './dto/update-defective-log.dto';
import { ProductStatus } from '@prisma/client';

@Injectable()
export class DefectiveLogService {
  constructor(private prisma: PrismaService) {}

  async create(createDefectiveLogDto: CreateDefectiveLogDto) {
    const { productId, quantity, description, userId, branchId, actionType = 'DEFECTIVE' } = createDefectiveLogDto;

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi');
    }

    // Check if branch exists
    if (branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId }
      });
      if (!branch) {
        throw new NotFoundException('Filial topilmadi');
      }
    }

    // Validate quantity based on action type
    if (actionType === 'DEFECTIVE') {
      // Defective quantity cannot exceed available quantity
      if (quantity > product.quantity) {
        throw new BadRequestException(`Defective miqdori mavjud miqdordan ko'p bo'lishi mumkin emas. Mavjud: ${product.quantity}, so'ralgan: ${quantity}`);
      }
    }

    // Calculate cash amount based on action type
    let cashAmount = 0;
    let newQuantity = product.quantity;
    let newDefectiveQuantity = product.defectiveQuantity;
    let newReturnedQuantity = product.returnedQuantity;
    let newExchangedQuantity = product.exchangedQuantity;
    let newStatus = product.status;

    switch (actionType) {
      case 'DEFECTIVE':
        // Kassadan pul chiqadi (mahsulot narhi)
        cashAmount = -(product.price * quantity);
        newQuantity = Math.max(0, product.quantity - quantity);
        newDefectiveQuantity = product.defectiveQuantity + quantity;
        newStatus = newQuantity === 0 ? ProductStatus.DEFECTIVE : ProductStatus.IN_STORE;
        break;

      case 'FIXED':
        // Kassaga pul qaytadi (mahsulot narhi)
        cashAmount = product.price * quantity;
        newDefectiveQuantity = Math.max(0, product.defectiveQuantity - quantity);
        newQuantity = product.quantity + quantity;
        newStatus = ProductStatus.IN_STORE;
        break;

      case 'RETURN':
        // Kassadan pul chiqadi (mahsulot narhi)
        cashAmount = -(product.price * quantity);
        newReturnedQuantity = product.returnedQuantity + quantity;
        newStatus = ProductStatus.RETURNED;
        break;

      case 'EXCHANGE':
        // Kassaga pul qaytadi (mahsulot narhi)
        cashAmount = product.price * quantity;
        newExchangedQuantity = product.exchangedQuantity + quantity;
        newStatus = ProductStatus.EXCHANGED;
        break;

      default:
        throw new BadRequestException('Noto\'g\'ri action type');
    }

    // Use transaction to ensure data consistency
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create defective log
      const defectiveLog = await prisma.defectiveLog.create({
        data: {
          productId,
          quantity,
          description,
          userId,
          branchId,
          cashAmount,
          actionType
        },
        include: {
          product: true,
          user: true,
          branch: true
        }
      });

      // Update product quantities and status
      await prisma.product.update({
        where: { id: productId },
        data: {
          quantity: newQuantity,
          defectiveQuantity: newDefectiveQuantity,
          returnedQuantity: newReturnedQuantity,
          exchangedQuantity: newExchangedQuantity,
          status: newStatus
        }
      });

      // Update branch cash balance
      if (branchId) {
        await prisma.branch.update({
          where: { id: branchId },
          data: {
            cashBalance: {
              increment: cashAmount
            }
          }
        });
      }

      return defectiveLog;
    });

    return result;
  }

  async findAll(query: any = {}) {
    const { branchId, actionType, startDate, endDate } = query;
    
    const where: any = {};
    
    if (branchId) {
      where.branchId = parseInt(branchId);
    }
    
    if (actionType) {
      where.actionType = actionType;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    return this.prisma.defectiveLog.findMany({
      where,
      include: {
        product: true,
        user: true,
        branch: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findByProduct(productId: number) {
    return this.prisma.defectiveLog.findMany({
      where: { productId },
      include: {
        product: true,
        user: true,
        branch: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findOne(id: number) {
    const defectiveLog = await this.prisma.defectiveLog.findUnique({
      where: { id },
      include: {
        product: true,
        user: true,
        branch: true
      }
    });

    if (!defectiveLog) {
      throw new NotFoundException('Defective log topilmadi');
    }

    return defectiveLog;
  }

  async update(id: number, updateDefectiveLogDto: UpdateDefectiveLogDto) {
    const defectiveLog = await this.findOne(id);

    return this.prisma.defectiveLog.update({
      where: { id },
      data: updateDefectiveLogDto,
      include: {
        product: true,
        user: true,
        branch: true
      }
    });
  }

  async markAsFixed(productId: number, quantity: number, userId?: number, branchId?: number) {
    return this.create({
      productId,
      quantity,
      description: 'Mahsulot tuzatildi',
      userId,
      branchId,
      actionType: 'FIXED'
    });
  }

  async returnProduct(productId: number, quantity: number, description: string, userId?: number, branchId?: number) {
    return this.create({
      productId,
      quantity,
      description,
      userId,
      branchId,
      actionType: 'RETURN'
    });
  }

  async exchangeProduct(productId: number, quantity: number, description: string, userId?: number, branchId?: number) {
    return this.create({
      productId,
      quantity,
      description,
      userId,
      branchId,
      actionType: 'EXCHANGE'
    });
  }

  async remove(id: number) {
    const defectiveLog = await this.findOne(id);

    return this.prisma.defectiveLog.delete({
      where: { id }
    });
  }

  async getDefectiveProducts(branchId?: number) {
    const where: any = {
      status: ProductStatus.DEFECTIVE
    };
    
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        branch: true,
        DefectiveLog: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

  async getFixedProducts(branchId?: number) {
    const where: any = {
      status: ProductStatus.FIXED
    };
    
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        branch: true,
        DefectiveLog: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

  async getReturnedProducts(branchId?: number) {
    const where: any = {
      status: ProductStatus.RETURNED
    };
    
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        branch: true,
        DefectiveLog: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

  async getExchangedProducts(branchId?: number) {
    const where: any = {
      status: ProductStatus.EXCHANGED
    };
    
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        branch: true,
        DefectiveLog: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

  // Get statistics for dashboard
  async getStatistics(branchId?: number, startDate?: string, endDate?: string) {
    const where: any = {};
    
    if (branchId) {
      where.branchId =branchId;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [defectiveStats, fixedStats, returnStats, exchangeStats, cashFlow] = await Promise.all([
      // Defective products
      this.prisma.defectiveLog.aggregate({
        where: { ...where, actionType: 'DEFECTIVE' },
        _sum: { quantity: true, cashAmount: true },
        _count: true
      }),
      // Fixed products
      this.prisma.defectiveLog.aggregate({
        where: { ...where, actionType: 'FIXED' },
        _sum: { quantity: true, cashAmount: true },
        _count: true
      }),
      // Returned products
      this.prisma.defectiveLog.aggregate({
        where: { ...where, actionType: 'RETURN' },
        _sum: { quantity: true, cashAmount: true },
        _count: true
      }),
      // Exchanged products
      this.prisma.defectiveLog.aggregate({
        where: { ...where, actionType: 'EXCHANGE' },
        _sum: { quantity: true, cashAmount: true },
        _count: true
      }),
      // Total cash flow
      this.prisma.defectiveLog.aggregate({
        where,
        _sum: { cashAmount: true }
      })
    ]);

    return {
      defectiveProducts: {
        quantity: defectiveStats._sum.quantity || 0,
        cashAmount: defectiveStats._sum.cashAmount || 0,
        count: defectiveStats._count || 0
      },
      fixedProducts: {
        quantity: fixedStats._sum.quantity || 0,
        cashAmount: fixedStats._sum.cashAmount || 0,
        count: fixedStats._count || 0
      },
      returnedProducts: {
        quantity: returnStats._sum.quantity || 0,
        cashAmount: returnStats._sum.cashAmount || 0,
        count: returnStats._count || 0
      },
      exchangedProducts: {
        quantity: exchangeStats._sum.quantity || 0,
        cashAmount: exchangeStats._sum.cashAmount || 0,
        count: exchangeStats._count || 0
      },
      totalCashFlow: cashFlow._sum.cashAmount || 0
    };
  }
}
