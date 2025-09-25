import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function startOfDayUTC(date?: Date) {
  const d = date ? new Date(date) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(params: { userId: number; branchId?: number; deviceId?: string; similarity?: number; payload?: any; when?: Date }) {
    const { userId, branchId, deviceId, similarity, payload } = params;
    if (!userId) throw new BadRequestException('userId is required');

    // ensure user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const today = startOfDayUTC(params.when);

    // upsert AttendanceDay for today
    const day = await this.prisma.attendanceDay.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, branchId: branchId ?? user.branchId ?? null, date: today, checkInAt: new Date(), deviceId },
      update: { checkInAt: { set: new Date() }, branchId: branchId ?? user.branchId ?? null, deviceId },
    });

    // create event
    await this.prisma.attendanceEvent.create({
      data: {
        userId,
        branchId: branchId ?? user.branchId ?? null,
        dayId: day.id,
        eventType: 'CHECK_IN' as any,
        deviceId,
        similarity: similarity ?? null,
        payload: payload ?? undefined,
      },
    });

    return day;
  }

  async checkOut(params: { userId: number; branchId?: number; deviceId?: string; similarity?: number; payload?: any; when?: Date }) {
    const { userId, branchId, deviceId, similarity, payload } = params;
    if (!userId) throw new BadRequestException('userId is required');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const today = startOfDayUTC(params.when);

    let day = await this.prisma.attendanceDay.findUnique({ where: { userId_date: { userId, date: today } } });
    if (!day) {
      // if checkout without checkin, create day with only checkout
      day = await this.prisma.attendanceDay.create({
        data: { userId, branchId: branchId ?? user.branchId ?? null, date: today, checkOutAt: new Date(), deviceId },
      });
    } else {
      // update checkout and totalMinutes
      const checkInAt = day.checkInAt ? new Date(day.checkInAt) : undefined;
      const checkOutAt = new Date();
      const totalMinutes = checkInAt ? Math.max(0, Math.round((+checkOutAt - +checkInAt) / 60000)) : day.totalMinutes ?? 0;
      day = await this.prisma.attendanceDay.update({
        where: { id: day.id },
        data: { checkOutAt, totalMinutes, branchId: branchId ?? user.branchId ?? null, deviceId },
      });
    }

    await this.prisma.attendanceEvent.create({
      data: {
        userId,
        branchId: branchId ?? user.branchId ?? null,
        dayId: day.id,
        eventType: 'CHECK_OUT' as any,
        deviceId,
        similarity: similarity ?? null,
        payload: payload ?? undefined,
      },
    });

    return day;
  }

  async createManual(dayData: { userId: number; date: string | Date; branchId?: number; checkInAt?: Date; checkOutAt?: Date; notes?: string; deviceId?: string; status?: string }) {
    const date = startOfDayUTC(new Date(dayData.date));
    return this.prisma.attendanceDay.create({
      data: {
        userId: dayData.userId,
        branchId: dayData.branchId ?? null,
        date,
        checkInAt: dayData.checkInAt ?? null,
        checkOutAt: dayData.checkOutAt ?? null,
        totalMinutes: dayData.checkInAt && dayData.checkOutAt ? Math.max(0, Math.round((+new Date(dayData.checkOutAt) - +new Date(dayData.checkInAt)) / 60000)) : 0,
        notes: dayData.notes ?? null,
        deviceId: dayData.deviceId ?? null,
        status: (dayData.status as any) ?? 'PRESENT',
      },
    });
  }

  async findAll(query: any) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(query.limit) || 30));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.userId) where.userId = parseInt(query.userId);
    if (query.branchId) where.branchId = parseInt(query.branchId);
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = startOfDayUTC(new Date(query.startDate));
      if (query.endDate) where.date.lte = startOfDayUTC(new Date(query.endDate));
    }

    const [items, total] = await Promise.all([
      this.prisma.attendanceDay.findMany({
        where,
        include: { user: true, branch: true, events: true },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.attendanceDay.count({ where }),
    ]);

    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: number) {
    const day = await this.prisma.attendanceDay.findUnique({ where: { id }, include: { user: true, branch: true, events: true } });
    if (!day) throw new NotFoundException('Attendance not found');
    return day;
  }

  async update(id: number, data: any) {
    const updated = await this.prisma.attendanceDay.update({ where: { id }, data });
    return updated;
  }

  async remove(id: number) {
    await this.prisma.attendanceEvent.deleteMany({ where: { dayId: id } });
    return this.prisma.attendanceDay.delete({ where: { id } });
  }

  // ===== Face Templates =====
  async registerFace(body: { userId: number; deviceId?: string; template?: string; vector?: any; imageUrl?: string }) {
    const { userId, deviceId, template, vector, imageUrl } = body || {} as any;
    if (!userId) throw new BadRequestException('userId is required');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let templateBytes: Buffer | null = null;
    if (typeof template === 'string' && template.length > 0) {
      // accept base64 (with or without data URL prefix)
      const b64 = template.includes(',') ? template.split(',').pop()! : template;
      try {
        templateBytes = Buffer.from(b64, 'base64');
      } catch {
        throw new BadRequestException('Invalid base64 template');
      }
    }

    const created = await this.prisma.faceTemplate.create({
      data: {
        userId,
        deviceId: deviceId ?? null,
        template: templateBytes ?? null,
        vector: vector ?? undefined,
        imageUrl: imageUrl ?? null,
      },
    });
    return created;
  }

  async listFaces(query: any) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(query.limit) || 30));
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.userId) where.userId = parseInt(query.userId);
    if (query.deviceId) where.deviceId = String(query.deviceId);

    const [items, total] = await Promise.all([
      this.prisma.faceTemplate.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.faceTemplate.count({ where }),
    ]);
    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async deleteFace(id: number) {
    return this.prisma.faceTemplate.delete({ where: { id } });
  }
}
