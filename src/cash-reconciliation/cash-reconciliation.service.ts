import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReconciliationStatus, ReconciliationPaymentType } from '@prisma/client';

@Injectable()
export class CashReconciliationService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    const { cashierId, branchId, reportDate, expectedCash, receivedCash, notes, details } = dto;
    
    // Parse date to start of day
    const parsedDate = new Date(reportDate);
    parsedDate.setUTCHours(0, 0, 0, 0);

    const diff = receivedCash - expectedCash;
    let status: ReconciliationStatus = ReconciliationStatus.PENDING;
    if (diff === 0) status = ReconciliationStatus.MATCHED;
    else if (diff < 0) status = ReconciliationStatus.SHORTAGE;
    else if (diff > 0) status = ReconciliationStatus.OVERAGE;

    // Check if daily reconciliation already exists
    const existing = await this.prisma.cashReconciliation.findUnique({
      where: {
        cashierId_branchId_reportDate: {
          cashierId: parseInt(cashierId),
          branchId: parseInt(branchId),
          reportDate: parsedDate,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Ушбу кун учун аллақачон касса назорати яратилган.');
    }

    return this.prisma.cashReconciliation.create({
      data: {
        cashierId: parseInt(cashierId),
        branchId: parseInt(branchId),
        reportDate: parsedDate,
        expectedCash: parseFloat(expectedCash),
        receivedCash: parseFloat(receivedCash),
        differenceAmount: diff,
        status,
        notes,
        details: {
          create: (details || []).map((detail: any) => {
            const exp = parseFloat(detail.expectedAmount || 0);
            const act = parseFloat(detail.actualAmount || 0);
            return {
              paymentType: detail.paymentType as ReconciliationPaymentType,
              expectedAmount: exp,
              actualAmount: act,
              difference: act - exp,
              reason: detail.reason,
            };
          }),
        },
      },
      include: {
        details: true,
        cashier: { select: { id: true, firstName: true, lastName: true, role: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(query: any = {}) {
    const { cashierId, branchId, status, startDate, endDate } = query;
    const where: any = {};

    if (cashierId) where.cashierId = parseInt(cashierId);
    if (branchId) where.branchId = parseInt(branchId);
    if (status) where.status = status as ReconciliationStatus;
    if (startDate || endDate) {
      where.reportDate = {};
      if (startDate) where.reportDate.gte = new Date(startDate);
      if (endDate) where.reportDate.lte = new Date(endDate);
    }

    return this.prisma.cashReconciliation.findMany({
      where,
      include: {
        cashier: { select: { id: true, firstName: true, lastName: true, username: true } },
        branch: { select: { id: true, name: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
        details: true,
        attachments: true,
      },
      orderBy: { reportDate: 'desc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.cashReconciliation.findUnique({
      where: { id },
      include: {
        cashier: { select: { id: true, firstName: true, lastName: true, username: true } },
        branch: { select: { id: true, name: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
        details: true,
        attachments: true,
      },
    });
    if (!item) throw new NotFoundException('Касса назорати топилмади.');
    return item;
  }

  async update(id: number, dto: any) {
    const { receivedCash, notes, reason, details } = dto;
    const item = await this.findOne(id);

    const updatedReceived = receivedCash !== undefined ? parseFloat(receivedCash) : item.receivedCash;
    const diff = updatedReceived - item.expectedCash;

    let status = item.status;
    if (item.status !== ReconciliationStatus.REJECTED && item.status !== ReconciliationStatus.PENDING) {
      if (diff === 0) status = ReconciliationStatus.MATCHED;
      else if (diff < 0) status = ReconciliationStatus.SHORTAGE;
      else if (diff > 0) status = ReconciliationStatus.OVERAGE;
    }

    // Update details if supplied
    if (details && Array.isArray(details)) {
      await this.prisma.cashReconciliationDetail.deleteMany({ where: { reconciliationId: id } });
      await this.prisma.cashReconciliationDetail.createMany({
        data: details.map((d: any) => {
          const exp = parseFloat(d.expectedAmount || 0);
          const act = parseFloat(d.actualAmount || 0);
          return {
            reconciliationId: id,
            paymentType: d.paymentType as ReconciliationPaymentType,
            expectedAmount: exp,
            actualAmount: act,
            difference: act - exp,
            reason: d.reason,
          };
        }),
      });
    }

    return this.prisma.cashReconciliation.update({
      where: { id },
      data: {
        receivedCash: updatedReceived,
        differenceAmount: diff,
        status,
        notes,
        reason,
      },
      include: {
        details: true,
        cashier: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async approve(id: number, userId: number, dto: any = {}) {
    const item = await this.findOne(id);
    const diff = item.receivedCash - item.expectedCash;
    
    let status: ReconciliationStatus = ReconciliationStatus.MATCHED;
    if (diff < 0) status = ReconciliationStatus.SHORTAGE;
    else if (diff > 0) status = ReconciliationStatus.OVERAGE;

    return this.prisma.cashReconciliation.update({
      where: { id },
      data: {
        status,
        approvedBy: userId,
        approvedAt: new Date(),
        reason: dto.reason || item.reason,
        notes: dto.notes || item.notes,
      },
      include: {
        details: true,
        cashier: { select: { id: true, firstName: true, lastName: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async reject(id: number, userId: number, dto: any = {}) {
    return this.prisma.cashReconciliation.update({
      where: { id },
      data: {
        status: ReconciliationStatus.REJECTED,
        approvedBy: userId,
        approvedAt: new Date(),
        reason: dto.reason,
        notes: dto.notes,
      },
      include: {
        details: true,
        cashier: { select: { id: true, firstName: true, lastName: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async delete(id: number) {
    await this.findOne(id);
    return this.prisma.cashReconciliation.delete({ where: { id } });
  }

  async addAttachment(reconciliationId: number, uploaderId: number, file: { fileName: string; filePath: string }) {
    await this.findOne(reconciliationId);
    return this.prisma.cashReconciliationAttachment.create({
      data: {
        reconciliationId,
        fileName: file.fileName,
        filePath: file.filePath,
        uploadedBy: uploaderId,
      },
    });
  }

  async getCashierHistory(cashierId: number) {
    return this.findAll({ cashierId });
  }

  async getBranchHistory(branchId: number) {
    return this.findAll({ branchId });
  }

  async getShortagesReport(query: any = {}) {
    const list = await this.prisma.cashReconciliation.findMany({
      where: {
        status: ReconciliationStatus.SHORTAGE,
        ...(query.branchId ? { branchId: parseInt(query.branchId) } : {}),
      },
      include: {
        cashier: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { differenceAmount: 'asc' }, // largest shortage first (more negative)
    });
    const totalAmount = list.reduce((sum, item) => sum + Math.abs(item.differenceAmount), 0);
    return { list, totalAmount };
  }

  async getOveragesReport(query: any = {}) {
    const list = await this.prisma.cashReconciliation.findMany({
      where: {
        status: ReconciliationStatus.OVERAGE,
        ...(query.branchId ? { branchId: parseInt(query.branchId) } : {}),
      },
      include: {
        cashier: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { differenceAmount: 'desc' }, // largest overage first
    });
    const totalAmount = list.reduce((sum, item) => sum + item.differenceAmount, 0);
    return { list, totalAmount };
  }

  async getDailyReconciliation(dateStr: string, branchId?: number) {
    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);
    return this.prisma.cashReconciliation.findMany({
      where: {
        reportDate: date,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        cashier: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true } },
        details: true,
      },
    });
  }

  async getMonthlyReconciliation(year: number, month: number, branchId?: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return this.prisma.cashReconciliation.findMany({
      where: {
        reportDate: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
      },
      include: {
        cashier: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true } },
        details: true,
      },
    });
  }
}
