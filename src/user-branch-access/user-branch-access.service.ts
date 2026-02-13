import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserBranchAccessDto } from './dto/create-user-branch-access.dto';
import { UpdateUserBranchAccessDto } from './dto/update-user-branch-access.dto';
import { UserBranchAccessResponseDto } from './dto/user-branch-access-response.dto';

@Injectable()
export class UserBranchAccessService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateUserBranchAccessDto): Promise<UserBranchAccessResponseDto> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: +createDto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${createDto.userId} not found`);
    }

    // Check if branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: +createDto.branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${createDto.branchId} not found`);
    }

    // Check if access already exists
    const existingAccess = await this.prisma.userBranchAccess.findUnique({
      where: {
        userId_branchId: {
          userId: +createDto.userId,
          branchId: +createDto.branchId,
        },
      },
    });

    if (existingAccess) {
      throw new Error('User already has access to this branch');
    }

    const access = await this.prisma.userBranchAccess.create({
      data: {
        userId: +createDto.userId,
        branchId: +createDto.branchId,
      },
      select: {
        id: true,
        userId: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return access;
  }

  async findAll(): Promise<UserBranchAccessResponseDto[]> {
    return this.prisma.userBranchAccess.findMany({
      select: {
        id: true,
        userId: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number): Promise<UserBranchAccessResponseDto> {
    const access = await this.prisma.userBranchAccess.findUnique({
      where: { id: +id },
      select: {
        id: true,
        userId: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!access) {
      throw new NotFoundException(`UserBranchAccess with ID ${id} not found`);
    }

    return access;
  }

  async update(
    id: number,
    updateDto: UpdateUserBranchAccessDto,
  ): Promise<UserBranchAccessResponseDto> {
    // Check if access exists
    const existingAccess = await this.prisma.userBranchAccess.findUnique({
      where: { id: +id },
    });
    if (!existingAccess) {
      throw new NotFoundException(`UserBranchAccess with ID ${id} not found`);
    }

    // If updating userId, check if user exists
    if (updateDto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: +updateDto.userId },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${updateDto.userId} not found`);
      }
    }

    // If updating branchId, check if branch exists
    if (updateDto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: +updateDto.branchId },
      });
      if (!branch) {
        throw new NotFoundException(`Branch with ID ${updateDto.branchId} not found`);
      }
    }

    // Check if the new combination already exists
    if (updateDto.userId || updateDto.branchId) {
      const userId = updateDto.userId || existingAccess.userId;
      const branchId = updateDto.branchId || existingAccess.branchId;

      const duplicate = await this.prisma.userBranchAccess.findFirst({
        where: {
          userId: +userId,
          branchId: +branchId,
          id: { not: +id }, // Exclude current record
        },
      });

      if (duplicate) {
        throw new Error('This user-branch access already exists');
      }
    }

    const updatedAccess = await this.prisma.userBranchAccess.update({
      where: { id },
      data: updateDto,
      select: {
        id: true,
        userId: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedAccess;
  }

  async remove(id: number): Promise<void> {
    // Check if access exists
    const access = await this.prisma.userBranchAccess.findUnique({
      where: { id: +id },
    });
    
    if (!access) {
      throw new NotFoundException(`UserBranchAccess with ID ${id} not found`);
    }

    await this.prisma.userBranchAccess.delete({
      where: { id: +id },
    });
  }

  async findByUserId(userId: number): Promise<UserBranchAccessResponseDto[]> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.prisma.userBranchAccess.findMany({
      where: { userId: +userId },
      select: {
        id: true,
        userId: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });
  }

  async findByBranchId(branchId: number): Promise<UserBranchAccessResponseDto[]> {
    // Check if branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    return this.prisma.userBranchAccess.findMany({
      where: { branchId: +branchId },
      select: {
        id: true,
        userId: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });
  }
}
