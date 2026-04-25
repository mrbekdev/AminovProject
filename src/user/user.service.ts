import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

type UserWithBranches = {
  id: number;
  username: string;
  role: string;
  branchId?: number;
  allowedBranches: { branch: { id: number; name: string } }[];
  [key: string]: any;
};

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto) {
    const { allowedBranches, workStartTime, workEndTime, workShift, ...userData } = createUserDto;
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const data: any = {
      ...userData,
      password: hashedPassword,
      workStartTime,
      workEndTime,
      workShift: workShift || 'DAY',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Check for existing users by username or phone
    const orConditions: any[] = [];
    if (userData.username) orConditions.push({ username: userData.username });
    if (userData.phone) orConditions.push({ phone: userData.phone });

    if (orConditions.length > 0) {
      const existingUsers = await this.prisma.user.findMany({ where: { OR: orConditions } });
      if (existingUsers.length > 0) {
        // If any existing user is ACTIVE (not DELETED) -> conflict
        const activeUser = existingUsers.find(u => u.status !== 'DELETED');
        if (activeUser) {
          throw new ConflictException('Username or phone already exists');
        }

        // All matches are DELETED. If exactly one, restore/update it instead of creating a new record.
        if (existingUsers.length === 1) {
          const deletedUser = existingUsers[0];

          // Ensure allowedBranches is set on the deleted user
          let finalAllowedBranches = allowedBranches || [];
          if (finalAllowedBranches.length === 0) {
            const allBranches = await this.prisma.branch.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
            finalAllowedBranches = allBranches.map(b => b.id);
          }

          const updateData: any = {
            ...userData,
            password: hashedPassword,
            workStartTime,
            workEndTime,
            workShift: workShift || 'DAY',
            status: 'ACTIVE',
            updatedAt: new Date(),
            allowedBranches: {
              create: finalAllowedBranches.map(branchId => ({ branch: { connect: { id: branchId } } }))
            }
          };

          if (userData.role === 'MARKETING') {
            delete updateData.branchId;
          }

          return this.prisma.user.update({
            where: { id: deletedUser.id },
            data: updateData,
            include: {
              branch: true,
              allowedBranches: { include: { branch: true } }
            }
          });
        }
        throw new ConflictException('Conflicting deleted user records found for provided username/phone');
      }
    }

    // Always handle allowedBranches for all roles
    let finalAllowedBranches = allowedBranches || [];
    if (finalAllowedBranches.length === 0) {
      const allBranches = await this.prisma.branch.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true }
      });
      finalAllowedBranches = allBranches.map(b => b.id);
    }

    data.allowedBranches = {
      create: finalAllowedBranches.map(branchId => ({
        branch: { connect: { id: branchId } }
      }))
    };
    
    // For MARKETING role, don't set a primary branchId
    if (userData.role === 'MARKETING') {
      delete data.branchId;
    }

    return this.prisma.user.create({
      data,
      include: {
        branch: true,
        allowedBranches: {
          include: {
            branch: true
          }
        }
      }
    });
  }

  async findAll(skip: number, take: number, role?: string, branchId?: number) {
    const where: any = {
      status: {
        not: 'DELETED',
      },
    };
    if (role) {
      where.role = role;
    }
    if (branchId) {
      where.branchId = branchId;
    }
    return this.prisma.user.findMany({
      skip,
      take,
      where,
      include: { 
        branch: true,
        allowedBranches: {
          include: {
            branch: true
          }
        }
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { 
        branch: true,
        allowedBranches: {
          include: {
            branch: true
          }
        }
      },
    });

    if (!user || user.status === 'DELETED') {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const { allowedBranches, workStartTime, workEndTime, workShift, ...userData } = updateUserDto;
    const data: any = { ...userData, updatedAt: new Date() };
    
    if (userData.password) {
      data.password = await bcrypt.hash(userData.password, 10);
    }

    // Update working hours if provided
    if (workStartTime) data.workStartTime = workStartTime;
    if (workEndTime) data.workEndTime = workEndTime;
    if (workShift) data.workShift = workShift;

    if (allowedBranches !== undefined) {
      // Delete existing allowed branches
      await this.prisma.userBranchAccess.deleteMany({
        where: { userId: id }
      });

      let finalAllowedBranches = allowedBranches;
      if (finalAllowedBranches.length === 0) {
        const allBranches = await this.prisma.branch.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true }
        });
        finalAllowedBranches = allBranches.map(b => b.id);
      }

      data.allowedBranches = {
        create: finalAllowedBranches.map(branchId => ({
          branch: { connect: { id: branchId } }
        }))
      };
    }
    
    if (userData.role === 'MARKETING') {
      delete data.branchId;
    }

    // Convert string role to enum value
    const roleEnum = userData.role as UserRole;

    // Build update data object, only including defined values
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (userData.firstName !== undefined) updateData.firstName = userData.firstName;
    if (userData.lastName !== undefined) updateData.lastName = userData.lastName;
    if (userData.username !== undefined) updateData.username = userData.username;
    if (userData.phone !== undefined) updateData.phone = userData.phone;
    if (userData.role !== undefined) updateData.role = roleEnum;
    if (userData.isActive !== undefined) updateData.status = userData.isActive ? 'ACTIVE' : 'DELETED';
    if (workStartTime !== undefined) updateData.workStartTime = workStartTime;
    if (workEndTime !== undefined) updateData.workEndTime = workEndTime;
    if (workShift !== undefined) updateData.workShift = workShift;
    if (userData.branchId !== undefined && userData.role !== 'MARKETING') updateData.branchId = userData.branchId;
    if (data.password) updateData.password = data.password;

    return this.prisma.user.update({
      where: {
        id: id
      },
      data: updateData
    });
  }

  async remove(id: number) {
    const findUser = await this.prisma.user.findUnique({ where: { id } });
    if (!findUser) throw new Error('User not found');
    return this.prisma.user.update({
      where: { id },
      data: { status: 'DELETED', updatedAt: new Date() },
    });
  }

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({ 
      where: { username },
      include: {
        branch: true,
        allowedBranches: {
          include: {
            branch: true
          }
        }
      }
    });
    return user;
  }

  async getUserWithBranches(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        branch: true,
        allowedBranches: {
          include: {
            branch: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async checkUsernameExists(username: string, excludeUserId?: number) {
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });
    
    if (!existingUser) return false;
    
    // If we're checking for an existing user (edit mode), it's okay if the username belongs to that user
    if (excludeUserId && existingUser.id === excludeUserId) {
      return false;
    }
    
    return true;
  }

  async getUserDashboardStats(userId: number, startDate: string, endDate: string, userRole: string, branchId?: number) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const mappedBonuses = await this.prisma.bonus.findMany({
      where: {
        userId: userId,
        createdAt: { gte: start, lte: end }
      },
      orderBy: { createdAt: 'desc' }
    });

    const transactionWhere: any = {
      AND: [
        {
          OR: [
            { soldByUserId: userId },
            { userId: userId }
          ]
        }
      ],
      createdAt: { gte: start, lte: end }
    };

    if (userRole !== 'ADMIN' && branchId) {
      transactionWhere.AND.push({
        OR: [
          { fromBranchId: Number(branchId) },
          { toBranchId: Number(branchId) }
        ]
      });
    }

    const userTransactions = await this.prisma.transaction.findMany({
      where: transactionWhere,
      include: {
        customer: true,
        items: true,
        bonuses: true
      }
    });

    const totalSales = userTransactions.reduce((sum, tx) => sum + (tx.finalTotal || 0), 0);
    const transactionBonuses = userTransactions.reduce((sum, tx) => sum + (tx.bonuses ? tx.bonuses.reduce((s, b) => s + b.amount, 0) : 0), 0);
    
    const rawExtraProfit = userTransactions.reduce((sum, tx) => {
      const ep = tx.extraProfit || 0;
      const maxAllowed = Math.abs(tx.finalTotal || 0);
      const safeEp = maxAllowed > 0 && Math.abs(ep) > maxAllowed * 10 ? 0 : ep;
      return sum + safeEp;
    }, 0);

    const totalMonthlyBonuses = mappedBonuses.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalSofOrtiqcha = mappedBonuses.reduce((sum, b) => {
      if (b.reason === 'SALES_BONUS' && b.description) {
        const match = b.description.match(/Sof ortiqcha:\s*([\d,]+)/);
        return match ? sum + parseInt(match[1].replace(/,/g, ''), 10) : sum;
      }
      return sum;
    }, 0);

    const totalNetBonuses = mappedBonuses.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalPositiveBonuses = mappedBonuses.filter(b => (b.amount || 0) > 0).reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalPenalties = mappedBonuses.filter(b => (b.amount || 0) < 0).reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalProfit = rawExtraProfit;

    const bonusProducts = await this.prisma.transactionBonusProduct.findMany({
      where: {
        transaction: transactionWhere
      },
      include: {
        transaction: {
          select: {
            id: true,
            createdAt: true,
            total: true
          }
        },
        product: true
      },
      orderBy: {
        transaction: {
          createdAt: 'desc'
        }
      }
    });

    const bonusProductsValue = bonusProducts.reduce((sum, bp) => {
      const price = Number((bp as any).price || (bp as any).product?.price || 0);
      const quantity = Number(bp.quantity || 1);
      return sum + (price * quantity);
    }, 0);

    const totalBonuses = totalMonthlyBonuses + bonusProductsValue;

    const exchangeRateRecord = await this.prisma.currencyExchangeRate.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    const exchangeRate = exchangeRateRecord ? exchangeRateRecord.rate : 12500;

    const salesData = userTransactions.map(tx => ({
      id: tx.id,
      userId: tx.soldByUserId || tx.userId,
      branchId: tx.fromBranchId || tx.toBranchId || branchId,
      customerName: tx.customer ? (tx.customer.fullName || "Noma'lum") : "Noma'lum",
      totalInSom: tx.finalTotal,
      total: tx.finalTotal / exchangeRate,
      paymentType: tx.paymentType,
      createdAt: tx.createdAt,
      items: tx.items || []
    }));

    const summary: any = {
      [userId]: {
        totalSales: 0,
        totalSalesInSom: 0,
        transactionCount: 0,
        cashSales: 0,
        cardSales: 0,
        creditSales: 0,
        branches: new Set<number>()
      }
    };

    salesData.forEach(sale => {
      const uid = String(sale.userId || userId);
      if (!summary[uid]) {
        summary[uid] = { totalSales: 0, totalSalesInSom: 0, transactionCount: 0, cashSales: 0, cardSales: 0, creditSales: 0, branches: new Set() };
      }
      summary[uid].totalSales += sale.total || 0;
      summary[uid].totalSalesInSom += sale.totalInSom || 0;
      summary[uid].transactionCount += 1;
      if (sale.branchId) summary[uid].branches.add(sale.branchId as number);
      if (sale.paymentType === 'CASH') summary[uid].cashSales += sale.total || 0;
      else if (sale.paymentType === 'CARD') summary[uid].cardSales += sale.total || 0;
      else if (['CREDIT', 'INSTALLMENT'].includes(sale.paymentType as string)) summary[uid].creditSales += sale.total || 0;
    });

    const earningsSummary: any = {};
    Object.keys(summary).forEach(uid => {
      earningsSummary[uid] = { ...summary[uid], branches: Array.from(summary[uid].branches) };
    });

    return {
      monthlyStats: {
        totalSales,
        transactionBonuses,
        bonusProductsValue,
        totalBonuses,
        totalNetBonuses,
        totalPositiveBonuses,
        totalPenalties,
        totalMonthlyBonuses,
        totalExtraProfit: rawExtraProfit,
        totalSofOrtiqcha,
        totalProfit
      },
      salesData,
      userBonusProducts: bonusProducts,
      earningsSummary,
      bonuses: mappedBonuses
    };
  }
}