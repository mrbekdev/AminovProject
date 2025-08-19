import { Injectable } from '@nestjs/common';
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
      include: { products: true },
    });
  }

  async findAll(skip: number, take: number) {
    return this.prisma.category.findMany({
      skip,
      take,
      include: { products: true },
    });
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    return this.prisma.category.update({
      where: { id },
      data: { ...updateCategoryDto, updatedAt: new Date(),branchId:Number(updateCategoryDto.branchId) },
    });
  }

  async remove(id: number) {
    return this.prisma.category.delete({ where: { id } });
  }
}