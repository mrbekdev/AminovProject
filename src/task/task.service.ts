import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskGateway } from './task.gateway';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService, private readonly gateway: TaskGateway) {}

  private parseLegacyCollectedFromNote(note?: string | null): number {
    const text = String(note || '');
    const marker = text.match(/\[COLLECTED=(\d+(?:\.\d+)?)\]/i);
    if (marker?.[1]) return Number(marker[1]) || 0;
    const old = text.match(/Qabul qilingan summa:\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (old?.[1]) return Number(old[1]) || 0;
    return 0;
  }

  private parseDateRange(startDate?: string, endDate?: string) {
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate);
      if (!startDate.endsWith('Z') && !startDate.includes('+')) {
        start.setUTCHours(start.getUTCHours() - 5);
      }
    }
    if (endDate) {
      end = new Date(endDate);
      if (!endDate.endsWith('Z') && !endDate.includes('+')) {
        end.setUTCDate(end.getUTCDate() + 1);
        end.setUTCHours(end.getUTCHours() - 5);
        end.setTime(end.getTime() - 1);
      }
    }
    return { start, end };
  }

  async create(data: { transactionId: number; auditorId?: number | null; status?: 'PENDING' | 'ACCEPTED' | 'DELIVERED' }) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: Number(data.transactionId) },
      include: { payments: true }
    });
    if (!tx) throw new BadRequestException('Transaction not found');
    const uydanAmount = (tx.payments || [])
      .filter((p: any) => String(p?.method || '').toUpperCase() === 'UYDAN')
      .reduce((sum: number, p: any) => sum + Number(p?.amount || 0), 0);

    const created = await (this.prisma as any).task.create({
      data: {
        transactionId: Number(data.transactionId),
        auditorId: data.auditorId ?? null,
        status: data.status ?? 'PENDING',
        uydanAmount,
      },
      include: {
        transaction: { include: { customer: true, items: true, payments: true, soldBy: true } },
        auditor: true,
        uydanCollectedBy: true,
      },
    });
    try { this.gateway.emitUpdated({ type: 'created', id: created.id }); } catch {}
    return created;
  }

  async findAll(status?: 'PENDING' | 'ACCEPTED' | 'DELIVERED', auditorId?: number, startDate?: string, endDate?: string) {
    let where: any;

    if (auditorId != null && !status && !startDate && !endDate) {
      where = {
        OR: [
          { status: 'PENDING' },
          { status: 'ACCEPTED', auditorId: Number(auditorId) },
          { status: 'DELIVERED', auditorId: Number(auditorId) },
        ],
      };
    } else {
      where = {
        ...(status ? { status } : {}),
        ...(auditorId != null ? { auditorId: Number(auditorId) } : {}),
      };

      if (startDate || endDate) {
        where.transaction = {};
        const { start, end } = this.parseDateRange(startDate, endDate);
        if (start) {
          where.transaction.createdAt = { ...where.transaction.createdAt, gte: start };
        }
        if (end) {
          where.transaction.createdAt = { ...where.transaction.createdAt, lte: end };
        }
      }
    }

    const take = (status === 'DELIVERED' && !startDate && !endDate) ? 50 : undefined;

    console.log('TaskService.findAll Prisma where:', JSON.stringify(where, null, 2));
    const tasks = await (this.prisma as any).task.findMany({
      where,
      take,
      include: { 
        transaction: { 
          include: { 
            customer: true, 
            items: { include: { product: true } },
            payments: true,
            soldBy: true 
          } 
        }, 
        auditor: true,
        uydanCollectedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`TaskService.findAll found ${tasks.length} tasks.`);
    return tasks;
  }

  async findByAuditor(auditorId: number, status?: 'PENDING' | 'ACCEPTED' | 'DELIVERED', startDate?: string, endDate?: string) {
    const where: any = {
      auditorId: Number(auditorId),
      ...(status ? { status } : {}),
    };

    if (startDate || endDate) {
      where.transaction = {};
      const { start, end } = this.parseDateRange(startDate, endDate);
      if (start) {
        where.transaction.createdAt = { ...where.transaction.createdAt, gte: start };
      }
      if (end) {
        where.transaction.createdAt = { ...where.transaction.createdAt, lte: end };
      }
    }

    const take = (status === 'DELIVERED' && !startDate && !endDate) ? 50 : undefined;

    return (this.prisma as any).task.findMany({
      where,
      take,
      include: { 
        transaction: { 
          include: { 
            customer: true, 
            items: { include: { product: true } },
            payments: true,
            soldBy: true 
          } 
        }, 
        auditor: true,
        uydanCollectedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const task = await (this.prisma as any).task.findUnique({ 
      where: { id: Number(id) }, 
      include: { 
        transaction: { 
          include: { 
            customer: true, 
            items: { include: { product: true } },
            payments: true,
            soldBy: true 
          } 
        }, 
        auditor: true,
        uydanCollectedBy: true,
      } 
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async accept(id: number, auditorId?: number) {
    // If already delivered, cannot accept
    const task = await (this.prisma as any).task.findUnique({ where: { id: Number(id) } });
    if (!task) throw new NotFoundException('Task not found');

    const updated = await (this.prisma as any).task.update({
      where: { id: Number(id) },
      data: { status: 'ACCEPTED', auditorId: auditorId ?? task.auditorId ?? null },
      include: { transaction: true, auditor: true },
    });
    try { this.gateway.emitUpdated({ type: 'accepted', id: updated.id }); } catch {}
    return updated;
  }

  async deliver(id: number) {
    const task = await (this.prisma as any).task.findUnique({ where: { id: Number(id) } });
    if (!task) throw new NotFoundException('Task not found');

    const delivered = await (this.prisma as any).task.update({
      where: { id: Number(id) },
      data: { status: 'DELIVERED' },
      include: { transaction: true, auditor: true },
    });
    try { this.gateway.emitUpdated({ type: 'delivered', id: delivered.id }); } catch {}
    return delivered;
  }

  async cancel(id: number) {
    const task = await (this.prisma as any).task.findUnique({ where: { id: Number(id) } });
    if (!task) throw new NotFoundException('Task not found');

    const canceled = await (this.prisma as any).task.update({
      where: { id: Number(id) },
      data: { status: 'PENDING', auditorId: null },
      include: { transaction: { include: { customer: true, items: true } }, auditor: true },
    });
    try { this.gateway.emitUpdated({ type: 'canceled', id: canceled.id }); } catch {}
    return canceled;
  }

  async collectUydan(id: number, userId: number, amount: number, note?: string) {
    const task = await (this.prisma as any).task.findUnique({
      where: { id: Number(id) },
      include: { transaction: { include: { payments: true } }, auditor: true }
    });
    if (!task) throw new NotFoundException('Task not found');

    if (String(task.status || '').toUpperCase() === 'PENDING') {
      throw new BadRequestException('Task hali qabul qilinmagan');
    }

    const uydanAmount = Number(task.uydanAmount || 0);
    if (uydanAmount <= 0) {
      throw new BadRequestException('Bu taskda UYDAN to\'lovi mavjud emas');
    }
    const collectedAmount = Number(amount || 0);
    if (!Number.isFinite(collectedAmount) || collectedAmount <= 0) {
      throw new BadRequestException('Qabul qilingan summa noto\'g\'ri');
    }
    if (collectedAmount > uydanAmount) {
      throw new BadRequestException(`Qabul qilingan summa UYDAN summadan katta bo\'lishi mumkin emas (${uydanAmount})`);
    }

    const alreadyCollected = Number(task?.uydanCollectedAmount || 0) || this.parseLegacyCollectedFromNote(task?.uydanCollectNote);
    const remainingBefore = Math.max(0, uydanAmount - alreadyCollected);
    if (remainingBefore <= 0) {
      throw new BadRequestException('UYDAN puli allaqachon to\'liq qabul qilingan');
    }
    if (collectedAmount > remainingBefore) {
      throw new BadRequestException(`Qabul qilingan summa qolgan summadan katta bo\'lishi mumkin emas (${remainingBefore})`);
    }
    const newCollectedTotal = alreadyCollected + collectedAmount;
    const fullyCollected = newCollectedTotal >= uydanAmount;

    let updated: any;
    try {
      updated = await (this.prisma as any).task.update({
        where: { id: Number(id) },
        data: {
          isUydanCollected: fullyCollected,
          uydanCollectedAmount: newCollectedTotal,
          uydanCollectedAt: new Date(),
          uydanCollectedById: Number(userId),
          uydanCollectNote: note ? String(note).trim() : null
        },
        include: {
          transaction: { include: { customer: true, items: { include: { product: true } }, payments: true, soldBy: true } },
          auditor: true,
          uydanCollectedBy: true
        }
      });
    } catch (e: any) {
      // Backward compatibility: if Prisma client/schema is not regenerated yet
      // and `uydanCollectedAmount` column is unknown, still mark as collected.
      const msg = String(e?.message || '');
      if (!msg.includes('uydanCollectedAmount')) throw e;
      const noteText = note ? String(note).trim() : '';
      const legacyNote = `[COLLECTED=${newCollectedTotal}] Qabul qilingan summa: ${newCollectedTotal}. ${noteText}`.trim();
      updated = await (this.prisma as any).task.update({
        where: { id: Number(id) },
        data: {
          isUydanCollected: fullyCollected,
          uydanCollectedAt: new Date(),
          uydanCollectedById: Number(userId),
          uydanCollectNote: legacyNote
        },
        include: {
          transaction: { include: { customer: true, items: { include: { product: true } }, payments: true, soldBy: true } },
          auditor: true,
          uydanCollectedBy: true
        }
      });
    }
    try { this.gateway.emitUpdated({ type: 'uydan_collected', id: updated.id }); } catch {}
    return updated;
  }

  emitUpdated(payload: any) {
    try {
      this.gateway.emitUpdated(payload);
    } catch {}
  }
}
