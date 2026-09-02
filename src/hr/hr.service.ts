import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationDto } from './dto/update-job-application.dto';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    search?: string;
    status?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, status, position, startDate, endDate, page = 1, limit = 50 } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (position && position !== 'ALL') {
      where.position = { contains: position, mode: 'insensitive' };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { position: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { experience: { contains: q, mode: 'insensitive' } },
        { telegramUsername: { contains: q, mode: 'insensitive' } },
        { telegramId: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [applications, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.jobApplication.count({ where }),
    ]);

    return {
      applications,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getStats() {
    const [
      total,
      newCount,
      inReviewCount,
      interviewCount,
      acceptedCount,
      rejectedCount,
    ] = await Promise.all([
      this.prisma.jobApplication.count(),
      this.prisma.jobApplication.count({ where: { status: 'NEW' } }),
      this.prisma.jobApplication.count({ where: { status: 'IN_REVIEW' } }),
      this.prisma.jobApplication.count({ where: { status: 'INTERVIEW' } }),
      this.prisma.jobApplication.count({ where: { status: 'ACCEPTED' } }),
      this.prisma.jobApplication.count({ where: { status: 'REJECTED' } }),
    ]);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayCount = await this.prisma.jobApplication.count({
      where: { createdAt: { gte: startOfToday } },
    });

    return {
      total,
      new: newCount,
      inReview: inReviewCount,
      interview: interviewCount,
      accepted: acceptedCount,
      rejected: rejectedCount,
      today: todayCount,
    };
  }

  async findOne(id: number) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id },
    });
    if (!application) {
      throw new NotFoundException(`Application #${id} not found`);
    }
    return application;
  }

  async findByTelegramId(telegramId: string) {
    if (!telegramId) return [];
    return this.prisma.jobApplication.findMany({
      where: { telegramId: String(telegramId) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateJobApplicationDto) {
    return this.prisma.jobApplication.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        age: dto.age ? Number(dto.age) : null,
        position: dto.position || null,
        experience: dto.experience || null,
        address: dto.address || null,
        expectedSalary: dto.expectedSalary || null,
        about: dto.about || null,
        resumeUrl: dto.resumeUrl || null,
        telegramId: dto.telegramId ? String(dto.telegramId) : null,
        telegramUsername: dto.telegramUsername || null,
        status: dto.status || 'NEW',
        notes: dto.notes || null,
        rating: dto.rating ? Number(dto.rating) : 0,
        interviewDate: dto.interviewDate ? new Date(dto.interviewDate) : null,
      },
    });
  }

  async update(id: number, dto: UpdateJobApplicationDto) {
    await this.findOne(id);

    const data: any = { ...dto };
    if (dto.age !== undefined) data.age = dto.age ? Number(dto.age) : null;
    if (dto.rating !== undefined) data.rating = Number(dto.rating) || 0;
    if (dto.interviewDate !== undefined) {
      data.interviewDate = dto.interviewDate ? new Date(dto.interviewDate) : null;
    }

    return this.prisma.jobApplication.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.jobApplication.delete({
      where: { id },
    });
  }
}
