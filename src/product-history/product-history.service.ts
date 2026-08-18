import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateProductHistoryDto {
  productId: number;
  actionType: 'CREATED' | 'UPDATED' | 'SALE' | 'BONUS_GIFT' | 'INCOMING_STOCK' | 'REVIZOR_ADJUSTMENT' | 'DELETED' | string;
  performedById?: number | null;
  performedByName?: string | null;
  description: string;
  oldValues?: any;
  newValues?: any;
  quantityChange?: number | null;
  priceChange?: number | null;
}

@Injectable()
export class ProductHistoryService {
  constructor(private prisma: PrismaService) {}

  async createLog(dto: CreateProductHistoryDto) {
    try {
      let performedByName = dto.performedByName;
      if (!performedByName && dto.performedById) {
        const user = await this.prisma.user.findUnique({
          where: { id: dto.performedById },
          select: { firstName: true, lastName: true, username: true },
        });
        if (user) {
          performedByName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
        }
      }

      return await (this.prisma as any).productHistory.create({
        data: {
          productId: Number(dto.productId),
          actionType: dto.actionType,
          performedById: dto.performedById ? Number(dto.performedById) : null,
          performedByName: performedByName || 'Tizim',
          description: dto.description,
          oldValues: dto.oldValues ?? null,
          newValues: dto.newValues ?? null,
          quantityChange: dto.quantityChange != null ? Number(dto.quantityChange) : null,
          priceChange: dto.priceChange != null ? Number(dto.priceChange) : null,
        },
      });
    } catch (error) {
      console.error('Error creating product history log:', error);
      return null;
    }
  }

  async findByProduct(productId: number, page: number = 1, limit: number = 20) {
    const pid = Number(productId);
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      (this.prisma as any).productHistory.findMany({
        where: { productId: pid },
        include: {
          performedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
      }),
      (this.prisma as any).productHistory.count({
        where: { productId: pid },
      }),
    ]);

    const formattedItems = items.map((item: any) => {
      const user = item.performedBy;
      const userName = user
        ? ([user.firstName, user.lastName].filter(Boolean).join(' ') || user.username)
        : (item.performedByName || 'Tizim');

      return {
        id: item.id,
        productId: item.productId,
        actionType: item.actionType,
        performedById: item.performedById,
        performedByName: userName,
        userRole: user?.role || null,
        description: item.description,
        oldValues: item.oldValues,
        newValues: item.newValues,
        quantityChange: item.quantityChange,
        priceChange: item.priceChange,
        createdAt: item.createdAt,
      };
    });

    return {
      items: formattedItems,
      total,
      page: p,
      limit: l,
      hasMore: skip + items.length < total,
    };
  }
}
