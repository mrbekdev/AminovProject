import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskGateway } from './task.gateway';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService, private readonly gateway: TaskGateway) {}

  async create(data: { transactionId: number; auditorId?: number | null; status?: 'PENDING' | 'ACCEPTED' | 'DELIVERED' }) {
    const tx = await this.prisma.transaction.findUnique({ where: { id: Number(data.transactionId) } });
    if (!tx) throw new BadRequestException('Transaction not found');

    const created = await (this.prisma as any).task.create({
      data: {
        transactionId: Number(data.transactionId),
        auditorId: data.auditorId ?? null,
        status: data.status ?? 'PENDING',
      },
      include: {
        transaction: { include: { customer: true, items: true } },
        auditor: true,
      },
    });
    try { this.gateway.emitUpdated({ type: 'created', id: created.id }); } catch {}
    return created;
  }

  async findAll(status?: 'PENDING' | 'ACCEPTED' | 'DELIVERED', auditorId?: number) {
    return (this.prisma as any).task.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(auditorId != null ? { auditorId: Number(auditorId) } : {}),
      },
      include: { transaction: { include: { customer: true, items: true } }, auditor: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByAuditor(auditorId: number, status?: 'PENDING' | 'ACCEPTED' | 'DELIVERED') {
    return (this.prisma as any).task.findMany({
      where: { auditorId: Number(auditorId), ...(status ? { status } : {}) },
      include: { transaction: { include: { customer: true, items: true } }, auditor: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const task = await (this.prisma as any).task.findUnique({ where: { id: Number(id) }, include: { transaction: { include: { customer: true, items: true } }, auditor: true } });
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
}
