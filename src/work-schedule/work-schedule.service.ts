import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkScheduleDto } from './dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';

@Injectable()
export class WorkScheduleService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Ensure there is always a default schedule
    try {
      await this.ensureDefaultExists();
    } catch (e) {
      // Swallow initialization errors to not block app boot
      // They will surface on first API use if persistent
    }
  }

  async create(createWorkScheduleDto: CreateWorkScheduleDto) {
    // If this is being set as default, unset all other defaults first
    if (createWorkScheduleDto.isDefault) {
      await (this.prisma as any).workSchedule.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return (this.prisma as any).workSchedule.create({
      data: createWorkScheduleDto,
    });
  }

  async findAll() {
    return (this.prisma as any).workSchedule.findMany({
      orderBy: [
        { isDefault: 'desc' }, // Default schedule first
        { createdAt: 'desc' },
      ],
    });
  }

  async findDefault() {
    const defaultSchedule = await (this.prisma as any).workSchedule.findFirst({
      where: { isDefault: true },
    });

    if (!defaultSchedule) {
      // If no default schedule exists, create one
      return this.create({
        workStartTime: '09:00',
        workEndTime: '18:00',
        isDefault: true,
        description: 'Default work schedule',
      });
    }

    return defaultSchedule;
  }

  async findOne(id: number) {
    const workSchedule = await (this.prisma as any).workSchedule.findUnique({
      where: { id },
    });

    if (!workSchedule) {
      throw new NotFoundException('Work schedule not found');
    }

    return workSchedule;
  }

  async update(id: number, updateWorkScheduleDto: UpdateWorkScheduleDto) {
    const workSchedule = await (this.prisma as any).workSchedule.findUnique({
      where: { id },
    });

    if (!workSchedule) {
      throw new NotFoundException('Work schedule not found');
    }

    // If this is being set as default, unset all other defaults first
    if (updateWorkScheduleDto.isDefault) {
      await (this.prisma as any).workSchedule.updateMany({
        where: { 
          isDefault: true,
          id: { not: id } // Don't update the current record
        },
        data: { isDefault: false },
      });
    }

    return (this.prisma as any).workSchedule.update({
      where: { id },
      data: updateWorkScheduleDto,
    });
  }

  async updateDefault(updateWorkScheduleDto: UpdateWorkScheduleDto) {
    const defaultSchedule = await this.findDefault();
    
    return this.update(defaultSchedule.id, {
      ...updateWorkScheduleDto,
      isDefault: true,
    });
  }

  async remove(id: number) {
    const workSchedule = await (this.prisma as any).workSchedule.findUnique({
      where: { id },
    });

    if (!workSchedule) {
      throw new NotFoundException('Work schedule not found');
    }

    // Don't allow deleting the default schedule if it's the only one
    if (workSchedule.isDefault) {
      const totalSchedules = await (this.prisma as any).workSchedule.count();
      if (totalSchedules === 1) {
        throw new NotFoundException('Cannot delete the only work schedule');
      }
    }

    return (this.prisma as any).workSchedule.delete({
      where: { id },
    });
  }

  async ensureDefaultExists() {
    const defaultSchedule = await (this.prisma as any).workSchedule.findFirst({
      where: { isDefault: true },
    });

    if (!defaultSchedule) {
      return this.create({
        workStartTime: '09:00',
        workEndTime: '18:00',
        isDefault: true,
        description: 'Default work schedule',
      });
    }

    return defaultSchedule;
  }
}
