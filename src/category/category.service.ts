import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        createdAt: new Date(),
        updatedAt: new Date(),
        branchId:Number(createCategoryDto.branchId)
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          where: { isDeleted: false },
        },
        branch: true,
      },
    });
  }

  async findAll(skip: number, take: number) {
    return this.prisma.category.findMany({
      skip,
      take,
      where: {
        OR: [
          { branchId: null },
          { branch: { status: { not: 'DELETED' } } },
        ],
      },
      include: {
        products: {
          where: { isDeleted: false },
        },
        branch: true,
      },
    });
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    return this.prisma.category.update({
      where: { id },
      data: { ...updateCategoryDto, updatedAt: new Date(),branchId:Number(updateCategoryDto.branchId) },
    });
  }

  async remove(id: number, userId?: number) {
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && user.role !== 'BIGADMIN') {
        const setting = await this.prisma.systemSetting.findUnique({ where: { id: 1 } });
        if (setting && !setting.adminAllowDeleteCategory) {
          throw new ForbiddenException('Категорияларни ўчириш BigAdmin томонидан чекланган.');
        }
      }
    }
    await this.prisma.product.updateMany({
      where: { categoryId: id },
      data: { isDeleted: true },
    });
    return this.prisma.category.delete({ where: { id } });
  }
}