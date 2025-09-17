import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchType } from '@prisma/client';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}

  async create(createBranchDto: CreateBranchDto) {
    const { name, location, type } = createBranchDto as { name: string; location?: string; type?: string };
    return this.prisma.branch.create({
      data: {
        name,
        address: location || null,
        type: type as BranchType|| 'SAVDO_MARKAZ',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.branch.findUnique({
      where: { id ,AND: { status: { not: 'DELETED' } } as any},
      select: {
        id: true,
        name: true,
        address: true,
        type: true,
        phoneNumber: true,
        cashBalance: true,
        createdAt: true,
        updatedAt: true,
        products: true,
        users: true,
      },
    });
  }

  async findAll() {
    return this.prisma.branch.findMany({
      where: { status: { not: 'DELETED' } },
      select: {
        id: true,
        name: true,
        address: true,
        type: true,
        phoneNumber: true,
        cashBalance: true,
        createdAt: true,
        updatedAt: true,
        products: true,
        users: true,
      },
    });
  }

async update(id: number, updateBranchDto: UpdateBranchDto) {
  const { name, location, type } = updateBranchDto as { name?: string; location?: string; type?: string };

  return this.prisma.branch.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(location !== undefined ? { address: location } : {}),
      ...(type !== undefined ? { type: type as BranchType } : {}),
      updatedAt: new Date(),
      phoneNumber: updateBranchDto.phoneNumber,
    },
  });
}

  async remove(id: number) {
    const findBranch = await this.prisma.branch.findUnique({ where: { id } });
    if (!findBranch) throw new Error('Branch not found');
    return this.prisma.branch.update({
      where: { id },
      data: { status: 'DELETED', updatedAt: new Date() },
    });
  }
}


