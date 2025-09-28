import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findAll(skip: number, take: number) {
    return this.prisma.user.findMany({
      skip,
      take,
      where: {
        status: {
          not: 'DELETED',
        },
      },
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
}