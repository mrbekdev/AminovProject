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
        transaction: {
          include: {
            customer: true,
            items: { include: { product: true } },
            bonusProducts: { include: { product: true } },
            payments: true,
            soldBy: true
          }
        },
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
            bonusProducts: { include: { product: true } },
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
            bonusProducts: { include: { product: true } },
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
    const numericId = Number(id);
    if (!numericId || isNaN(numericId) || numericId <= 0) {
      throw new BadRequestException('Нотўғри Таск ID');
    }
    const task = await (this.prisma as any).task.findUnique({ 
      where: { id: numericId }, 
      include: { 
        transaction: { 
          include: { 
            customer: true, 
            items: { include: { product: true } },
            bonusProducts: { include: { product: true } },
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
    const numericId = Number(id);
    if (!numericId || isNaN(numericId) || numericId <= 0) throw new BadRequestException('Нотўғри Таск ID');

    const task = await (this.prisma as any).task.findUnique({ where: { id: numericId } });
    if (!task) throw new NotFoundException('Task not found');

    const updated = await (this.prisma as any).task.update({
      where: { id: numericId },
      data: { status: 'ACCEPTED', auditorId: auditorId ?? task.auditorId ?? null },
      include: {
        transaction: {
          include: {
            customer: true,
            items: { include: { product: true } },
            bonusProducts: { include: { product: true } },
            payments: true,
            soldBy: true
          }
        },
        auditor: true
      },
    });
    try { this.gateway.emitUpdated({ type: 'accepted', id: updated.id }); } catch {}
    return updated;
  }

  async deliver(id: number) {
    const numericId = Number(id);
    if (!numericId || isNaN(numericId) || numericId <= 0) throw new BadRequestException('Нотўғри Таск ID');

    const task = await (this.prisma as any).task.findUnique({ where: { id: numericId } });
    if (!task) throw new NotFoundException('Task not found');

    const delivered = await (this.prisma as any).task.update({
      where: { id: numericId },
      data: { status: 'DELIVERED' },
      include: {
        transaction: {
          include: {
            customer: true,
            items: { include: { product: true } },
            bonusProducts: { include: { product: true } },
            payments: true,
            soldBy: true
          }
        },
        auditor: true
      },
    });
    try { this.gateway.emitUpdated({ type: 'delivered', id: delivered.id }); } catch {}
    return delivered;
  }

  async cancel(id: number) {
    const numericId = Number(id);
    if (!numericId || isNaN(numericId) || numericId <= 0) throw new BadRequestException('Нотўғри Таск ID');

    const task = await (this.prisma as any).task.findUnique({ where: { id: numericId } });
    if (!task) throw new NotFoundException('Task not found');

    const canceled = await (this.prisma as any).task.update({
      where: { id: Number(id) },
      data: { status: 'PENDING', auditorId: null },
      include: {
        transaction: {
          include: {
            customer: true,
            items: { include: { product: true } },
            bonusProducts: { include: { product: true } },
            payments: true,
            soldBy: true
          }
        },
        auditor: true
      },
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
          transaction: {
            include: {
              customer: true,
              items: { include: { product: true } },
              bonusProducts: { include: { product: true } },
              payments: true,
              soldBy: true
            }
          },
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
          transaction: {
            include: {
              customer: true,
              items: { include: { product: true } },
              bonusProducts: { include: { product: true } },
              payments: true,
              soldBy: true
            }
          },
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

  async getDriverLeaderboard(startDate?: string, endDate?: string, currentAuditorId?: number) {
    const { start, end } = this.parseDateRange(startDate, endDate);

    const taskWhere: any = {};
    if (start || end) {
      const dateCond: any = {};
      if (start) dateCond.gte = start;
      if (end) dateCond.lte = end;
      taskWhere.OR = [
        { createdAt: dateCond },
        { transaction: { createdAt: dateCond } },
      ];
    }

    // 1. Group tasks by auditorId and status
    const taskGroups = await (this.prisma as any).task.groupBy({
      by: ['auditorId', 'status'],
      where: {
        ...taskWhere,
        auditorId: { not: null },
      },
      _count: {
        id: true,
      },
    });

    // 2. Count total pending tasks for the date range
    const pendingCount = await (this.prisma as any).task.count({
      where: {
        ...taskWhere,
        status: 'PENDING',
      },
    });

    // 3. Fetch all AUDITOR role users (couriers / delivery drivers)
    const auditors = await this.prisma.user.findMany({
      where: {
        role: 'AUDITOR',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
      },
    });

    // 4. Group driver ratings by driverId
    let opRatingMap = new Map<number, { avg: number; count: number }>();
    try {
      const operatorRatings = await (this.prisma as any).driverRating.groupBy({
        by: ['driverId'],
        _avg: { rating: true },
        _count: { rating: true },
      });

      operatorRatings.forEach((r: any) => {
        if (r.driverId) {
          opRatingMap.set(r.driverId, {
            avg: Number(r._avg.rating || 0),
            count: Number(r._count.rating || 0),
          });
        }
      });
    } catch (e) {
      console.warn('Could not group driver ratings:', e);
    }

    // Process per auditor statistics
    const statsMap = new Map<number, { assigned: number; completed: number }>();
    taskGroups.forEach((g: any) => {
      const aid = Number(g.auditorId);
      if (!aid) return;
      const existing = statsMap.get(aid) || { assigned: 0, completed: 0 };
      const st = String(g.status || '').toUpperCase();
      if (st === 'ACCEPTED') existing.assigned += g._count.id;
      else if (st === 'DELIVERED') existing.completed += g._count.id;
      statsMap.set(aid, existing);
    });

    const leaderboard: any[] = [];

    auditors.forEach((aud) => {
      const v = statsMap.get(aud.id) || { assigned: 0, completed: 0 };
      const completed = v.completed;
      const assigned = v.assigned;
      const total = assigned + completed;
      const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Score: completed * 2 + successRate * 0.5 + assigned * 0.25
      const score = completed * 2 + successRate * 0.5 + assigned * 0.25;

      const fullName = [aud.firstName, aud.lastName].filter(Boolean).join(' ');
      const name = fullName || aud.username || `Dostavchik ${aud.id}`;

      const opR = opRatingMap.get(aud.id);
      const operatorRating = opR ? Math.round(opR.avg * 10) / 10 : 0;
      const totalOperatorRatings = opR ? opR.count : 0;

      leaderboard.push({
        auditorId: aud.id,
        name,
        assigned,
        completed,
        successRate,
        score,
        operatorRating,
        totalOperatorRatings,
      });
    });

    // Sort leaderboard by score desc, completed desc, successRate desc
    leaderboard.sort((a, b) => b.score - a.score || b.completed - a.completed || b.successRate - a.successRate);

    const topScore = leaderboard[0]?.score || 0;

    leaderboard.forEach((item, idx) => {
      item.rank = idx + 1;
      const rawStars = topScore > 0 ? 1 + 4 * Math.max(0, Math.min(1, item.score / topScore)) : 5;
      let finalRating = rawStars;
      if (item.operatorRating > 0) {
        finalRating = rawStars * 0.7 + item.operatorRating * 0.3;
      }
      item.rating = Math.round(finalRating * 10) / 10;
    });

    // Current driver stats
    const myStat = leaderboard.find((x) => Number(x.auditorId) === Number(currentAuditorId)) || {
      auditorId: currentAuditorId,
      name: 'Siz',
      assigned: 0,
      completed: 0,
      successRate: 0,
      score: 0,
      rating: 5.0,
      rank: null,
      operatorRating: 0,
      totalOperatorRatings: 0,
    };

    return {
      pendingCount,
      myStats: {
        ...myStat,
        pendingOrders: pendingCount,
        assignedOrders: myStat.assigned,
        completedOrders: myStat.completed,
      },
      leaderboard,
    };
  }
}
