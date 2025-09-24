import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBonusDto } from './dto/create-bonus.dto';
import { UpdateBonusDto } from './dto/update-bonus.dto';

@Injectable()
export class BonusService {
  constructor(private prisma: PrismaService) {}

  async create(createBonusDto: CreateBonusDto, createdById: number) {
    const { bonusDate, ...rest } = createBonusDto;
    
    return (this.prisma as any).bonus.create({
      data: {
        ...rest,
        bonusDate: bonusDate ? new Date(bonusDate) : new Date(),
        createdById,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
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
  }

  async findAll(skip = 0, take = 100) {
    return (this.prisma as any).bonus.findMany({
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
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
  }

  async findByUserId(userId: number, skip = 0, take = 100) {
    return (this.prisma as any).bonus.findMany({
      where: {
        userId,
      },
      skip,
      take,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
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
  }

  async findOne(id: number) {
    const bonus = await (this.prisma as any).bonus.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
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

    if (!bonus) {
      throw new NotFoundException('Bonus not found');
    }

    return bonus;
  }

  async update(id: number, updateBonusDto: UpdateBonusDto) {
    const bonus = await (this.prisma as any).bonus.findUnique({
      where: { id },
    });

    if (!bonus) {
      throw new NotFoundException('Bonus not found');
    }

    const { bonusDate, ...rest } = updateBonusDto;

    return (this.prisma as any).bonus.update({
      where: { id },
      data: {
        ...rest,
        ...(bonusDate && { bonusDate: new Date(bonusDate) }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
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
  }

  async remove(id: number) {
    const bonus = await (this.prisma as any).bonus.findUnique({
      where: { id },
    });

    if (!bonus) {
      throw new NotFoundException('Bonus not found');
    }

    return (this.prisma as any).bonus.delete({
      where: { id },
    });
  }

  async getTotalBonusByUserId(userId: number) {
    const result = await (this.prisma as any).bonus.aggregate({
      where: {
        userId,
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalAmount: result._sum.amount || 0,
      totalCount: result._count.id || 0,
    };
  }

  async findByTransactionId(transactionId: number) {
    // Transaction ID asosida bonus ma'lumotlarini topish
    const bonuses = await (this.prisma as any).bonus.findMany({
      where: {
        transactionId: transactionId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        transaction: {
          select: {
            id: true,
            total: true,
            finalTotal: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return bonuses;
  }
}
