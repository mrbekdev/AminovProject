import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDefectiveLogDto } from './dto/create-defective-log.dto';
import { UpdateDefectiveLogDto } from './dto/update-defective-log.dto';
import { ProductStatus } from '@prisma/client';

@Injectable()
export class DefectiveLogService {
  constructor(private prisma: PrismaService) {}

  async create(createDefectiveLogDto: CreateDefectiveLogDto) {
    const { productId, quantity, description, userId } = createDefectiveLogDto;

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi');
    }

    // Check if product is sold (has transaction items)
    const transactionItems = await this.prisma.transactionItem.findMany({
      where: { productId },
      include: {
        transaction: {
          include: {
            customer: true
          }
        }
      }
    });

    if (transactionItems.length === 0) {
      throw new BadRequestException('Bu mahsulot hali sotilmagan');
    }

    // Create defective log
    const defectiveLog = await this.prisma.defectiveLog.create({
      data: {
        productId,
        quantity,
        description,
        userId
      },
      include: {
        product: true,
        user: true
      }
    });

    // Update product status to DEFECTIVE
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.DEFECTIVE,
        defectiveQuantity: {
          increment: quantity
        }
      }
    });

    return defectiveLog;
  }

  async findAll() {
    return this.prisma.defectiveLog.findMany({
      include: {
        product: true,
        user: true
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
        user: true
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
        user: true
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
        user: true
      }
    });
  }

  async markAsFixed(productId: number, userId?: number) {
    // Check if product exists and is defective
    const product = await this.prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi');
    }

    if (product.status !== ProductStatus.DEFECTIVE) {
      throw new BadRequestException('Bu mahsulot defective emas');
    }

    // Update product status to FIXED
    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.FIXED
      }
    });

    // Create a log entry for fixing
    await this.prisma.defectiveLog.create({
      data: {
        productId,
        quantity: 0, // 0 because we're just marking as fixed
        description: 'Mahsulot tuzatildi',
        userId
      }
    });

    return updatedProduct;
  }

  async remove(id: number) {
    const defectiveLog = await this.findOne(id);

    return this.prisma.defectiveLog.delete({
      where: { id }
    });
  }

  async getDefectiveProducts() {
    return this.prisma.product.findMany({
      where: {
        status: ProductStatus.DEFECTIVE
      },
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

  async getFixedProducts() {
    return this.prisma.product.findMany({
      where: {
        status: ProductStatus.FIXED
      },
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
}
