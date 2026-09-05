import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeletedRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async createLog(data: {
    entityType: 'PRODUCT' | 'TRANSACTION' | string;
    entityId?: number;
    title: string;
    details: any;
    deletedById?: number;
    deletedByName?: string;
    branchId?: number;
    reason?: string;
  }) {
    return this.prisma.deletedRecord.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        title: data.title,
        details: data.details,
        deletedById: data.deletedById || null,
        deletedByName: data.deletedByName || 'Admin',
        branchId: data.branchId || null,
        reason: data.reason || null,
      },
    });
  }

  async findAll(query: {
    entityType?: string;
    branchId?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { entityType, branchId, search, startDate, endDate } = query || {};

    const where: any = {};

    if (entityType && entityType !== 'ALL') {
      where.entityType = entityType;
    }

    if (branchId) {
      where.branchId = Number(branchId);
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { deletedByName: { contains: search.trim(), mode: 'insensitive' } },
        { reason: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const records = await this.prisma.deletedRecord.findMany({
      where,
      include: {
        deletedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            role: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return records;
  }

  async findOne(id: number) {
    const record = await this.prisma.deletedRecord.findUnique({
      where: { id },
      include: {
        deletedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            role: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Ўчирилган ёзув топилмади');
    }

    return record;
  }
}
