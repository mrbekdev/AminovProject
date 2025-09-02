import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}

  async create(createBranchDto: CreateBranchDto) {
    const { name, location } = createBranchDto as { name: string; location?: string };
    return this.prisma.branch.create({
      data: {
        name,
        address: location || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.branch.findUnique({
      where: { id },
      include: { products: true, users: true },
    });
  }

  async findAll() {
    return this.prisma.branch.findMany({
      include: { products: true, users: true },
    });
  }

  async update(id: number, updateBranchDto: UpdateBranchDto) {
    const { name, location } = updateBranchDto as { name?: string; location?: string };
    return this.prisma.branch.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(location !== undefined ? { address: location } : {}),
        updatedAt: new Date(),
      },
    });
  }

  async remove(id: number) {
    return this.prisma.branch.delete({ where: { id:+id } });
  }
}