import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DriverRatingService {
  constructor(private prisma: PrismaService) {}

  async createRating(data: {
    driverId: number;
    transactionId: number;
    rating: number;
    ratedBy: number;
    notes?: string;
  }) {
    // Validate rating is between 1 and 5
    if (data.rating < 1 || data.rating > 5) {
      throw new ConflictException('Rating must be between 1 and 5');
    }

    try {
      const rating = await this.prisma.driverRating.create({
        data: {
          driverId: data.driverId,
          transactionId: data.transactionId,
          rating: data.rating,
          ratedBy: data.ratedBy,
          notes: data.notes,
        },
      });
      return { success: true, rating };
    } catch (error) {
      // Handle unique constraint violation (already rated)
      if (error.code === 'P2002') {
        // Update existing rating instead
        const existing = await this.prisma.driverRating.findFirst({
          where: {
            driverId: data.driverId,
            transactionId: data.transactionId,
            ratedBy: data.ratedBy,
          },
        });
        if (existing) {
          const updated = await this.prisma.driverRating.update({
            where: { id: existing.id },
            data: { rating: data.rating, notes: data.notes },
          });
          return { success: true, rating: updated, updated: true };
        }
        throw new ConflictException('Failed to create or update rating');
      }
      throw error;
    }
  }

  async getBatchRatings(driverIds: number[]) {
    const ratings = await this.prisma.driverRating.groupBy({
      by: ['driverId'],
      where: {
        driverId: { in: driverIds },
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    return {
      ratings: ratings.map(r => ({
        driverId: r.driverId,
        rating: r._avg.rating || 0,
        totalRatings: r._count.rating,
      })),
    };
  }

  async getDriverRatingSummary(driverId: number) {
    const stats = await this.prisma.driverRating.aggregate({
      where: { driverId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const recentRatings = await this.prisma.driverRating.findMany({
      where: { driverId },
      include: {
        rater: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        transaction: {
          select: {
            id: true,
            finalTotal: true,
            createdAt: true,
            customer: {
              select: {
                fullName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      driverId,
      averageRating: stats._avg.rating || 0,
      totalRatings: stats._count.rating,
      recentRatings,
    };
  }

  async getTransactionRatings(transactionId: number) {
    return this.prisma.driverRating.findMany({
      where: { transactionId },
      include: {
        driver: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        rater: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });
  }

  async checkRating(transactionId: number, driverId: number, ratedBy: number) {
    const rating = await this.prisma.driverRating.findFirst({
      where: {
        transactionId,
        driverId,
        ratedBy,
      },
    });

    return {
      hasRated: !!rating,
      rating: rating || null,
    };
  }

  async getUnratedDeliveries(filters: {
    branchId?: number;
    startDate?: Date;
    endDate?: Date;
    ratedBy?: number;
  }) {
    const { branchId, startDate, endDate, ratedBy } = filters;

    // Build where clause for transactions
    const transactionWhere: any = {
      type: 'SALE',
      OR: [
        { deliveryType: 'DELIVERY' },
        { deliveryMethod: 'DELIVERY' },
        {
          tasks: {
            some: {
              uydanAmount: { gt: 0 },
            },
          },
        },
      ],
    };

    if (branchId) {
      transactionWhere.fromBranchId = branchId;
    }

    if (startDate || endDate) {
      transactionWhere.createdAt = {};
      if (startDate) transactionWhere.createdAt.gte = startDate;
      if (endDate) transactionWhere.createdAt.lte = endDate;
    }

    // Get all rated transaction IDs by this rater
    const ratedTransactionIds = ratedBy
      ? await this.prisma.driverRating.findMany({
          where: { ratedBy },
          select: { transactionId: true },
        }).then(ratings => ratings.map(r => r.transactionId))
      : [];

    // Find transactions that need rating
    const transactions = await this.prisma.transaction.findMany({
      where: {
        ...transactionWhere,
        NOT: {
          id: { in: ratedTransactionIds },
        },
      },
      include: {
        customer: {
          select: {
            fullName: true,
            phone: true,
          },
        },
        tasks: {
          include: {
            auditor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
              },
            },
          },
        },
        payments: true,
        items: {
          include: {
            product: {
              select: {
                name: true,
                model: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter only delivered transactions with a driver assigned
    const unratedDeliveries = transactions.filter(tx => {
      // Must have a task with an auditor (driver)
      const hasDriver = tx.tasks.some(t => t.auditorId);
      // Task should be delivered or has UYDAN
      const isDelivered = tx.tasks.some(t =>
        t.status === 'DELIVERED' ||
        (t.uydanAmount && t.uydanAmount > 0)
      );
      return hasDriver && isDelivered;
    });

    return {
      total: unratedDeliveries.length,
      transactions: unratedDeliveries,
    };
  }
}
