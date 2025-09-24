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

    // Only include branchId if role is not MARKETING
    if (userData.role === 'MARKETING') {
      delete data.branchId;
      if (allowedBranches && allowedBranches.length > 0) {
        data.allowedBranches = {
          create: allowedBranches.map(branchId => ({
            branch: { connect: { id: branchId } }
          }))
        };
      }
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

    // Handle branch relationships
    if (userData.role === 'MARKETING') {
      // Remove branchId for MARKETING role
      delete data.branchId;
      
      // Delete existing allowed branches
      await this.prisma.userBranchAccess.deleteMany({
        where: { userId: id }
      });

      // Add new allowed branches if any
      if (allowedBranches && allowedBranches.length > 0) {
        data.allowedBranches = {
          create: allowedBranches.map(branchId => ({
            branch: { connect: { id: branchId } }
          }))
        };
      }
    } else {
      // For non-MARKETING roles, clear allowedBranches
      await this.prisma.userBranchAccess.deleteMany({
        where: { userId: id }
      });
    }

    // Convert string role to enum value
    const roleEnum = userData.role as UserRole;

    return this.prisma.user.update({
      where: {
        id: id
      },
      data: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        phone: userData.phone,
        role: roleEnum, // Use converted enum value
        status: userData.isActive ? 'ACTIVE' : 'INACTIVE' as any,
        updatedAt: new Date(),
      }
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
    return this.prisma.user.findUnique({ 
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
}