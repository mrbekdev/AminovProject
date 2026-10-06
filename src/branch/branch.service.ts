import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchType } from '@prisma/client';

@Injectable()
export class BranchService {
  private branchesCache: any[] | null = null;
  private cacheExpiresAt = 0;

  constructor(private prisma: PrismaService) {}

  private invalidateCache() {
    this.branchesCache = null;
    this.cacheExpiresAt = 0;
  }

  async create(createBranchDto: CreateBranchDto) {
    this.invalidateCache();
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
    return this.prisma.branch.findFirst({
      where: { id, status: { not: 'DELETED' } },
      select: {
        id: true,
        name: true,
        address: true,
        type: true,
        phoneNumber: true,
        cashBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll(user?: any) {
    const now = Date.now();
    if (!this.branchesCache || now > this.cacheExpiresAt) {
      this.branchesCache = await this.prisma.branch.findMany({
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
        },
        orderBy: { id: 'asc' },
      });
      this.cacheExpiresAt = now + 60000; // 1 minute cache
    }

    const allBranches = this.branchesCache || [];

    if (user && user.role !== 'BIGADMIN' && user.role !== 'ADMIN') {
      const allowedBranchIds = (user.allowedBranches || [])
        .map((ab: any) => ab.branchId || ab.branch?.id || ab.id)
        .filter((id: any) => id != null && !isNaN(Number(id)))
        .map(Number);

      if (allowedBranchIds.length > 0) {
        return allBranches.filter((b: any) => allowedBranchIds.includes(b.id));
      } else if (user.branchId) {
        return allBranches.filter((b: any) => b.id === Number(user.branchId));
      }
    }

    return allBranches;
  }

  async update(id: number, updateBranchDto: UpdateBranchDto) {
    this.invalidateCache();
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

  async remove(id: number, userId?: number) {
    this.invalidateCache();
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && user.role !== 'BIGADMIN') {
        const setting = await this.prisma.systemSetting.findFirst();
        if (setting && setting.adminAllowDeleteBranch === false) {
          throw new Error("BigAdmin tomonidan filiallarni o'chirish taqiqlangan");
        }
      }
    }
    const findBranch = await this.prisma.branch.findUnique({ where: { id } });
    if (!findBranch) throw new Error('Branch not found');
    await this.prisma.product.updateMany({
      where: { branchId: id },
      data: { isDeleted: true, updatedAt: new Date() },
    });
    return this.prisma.branch.update({
      where: { id },
      data: { status: 'DELETED', updatedAt: new Date() },
    });
  }
}


