import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GlobalRateService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent() {
    const rate = await (this.prisma as any).globalRate.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    return rate || null;
  }

  async findAll() {
    return (this.prisma as any).globalRate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(value: number) {
    return (this.prisma as any).globalRate.create({ data: { value: Number(value) } });
  }

  async update(id: number, value: number) {
    const existing = await (this.prisma as any).globalRate.findUnique({ where: { id: Number(id) } });
    if (!existing) throw new NotFoundException('GlobalRate not found');
    return (this.prisma as any).globalRate.update({ where: { id: Number(id) }, data: { value: Number(value) } });
  }

  async remove(id: number) {
    return (this.prisma as any).globalRate.delete({ where: { id: Number(id) } });
  }
}
