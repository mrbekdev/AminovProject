import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDebtCashierReportDto } from './dto/create-debt-cashier-report.dto';
import { ApproveDebtCashierReportDto } from './dto/approve-debt-cashier-report.dto';

@Injectable()
export class DebtCashierReportService {
  constructor(private readonly prisma: PrismaService) {}

  private getTodayDate(): Date {
    const todayStr = new Date().toISOString().split('T')[0];
    return new Date(`${todayStr}T00:00:00.000Z`);
  }

  async createOrUpdateReport(userId: number, userBranchId: number | null, dto: CreateDebtCashierReportDto) {
    const finalUserId = dto.cashierId || userId;
    const branchId = dto.branchId || userBranchId;
    if (!branchId) {
      throw new BadRequestException('Филиал ID кўрсатилмаган.');
    }

    const reportDate = this.getTodayDate();

    // Check if report already exists for today
    const existing = await this.prisma.debtCashierReport.findFirst({
      where: {
        cashierId: finalUserId,
        reportDate: reportDate,
      },
    });

    if (existing) {
      // Update existing today's report
      return await this.prisma.debtCashierReport.update({
        where: { id: existing.id },
        data: {
          cashAmount: dto.cashAmount ?? existing.cashAmount,
          click9905Amount: dto.click9905Amount ?? existing.click9905Amount,
          bankAccountAmount: dto.bankAccountAmount ?? existing.bankAccountAmount,
          onlineAmount: dto.onlineAmount ?? existing.onlineAmount,
          terminalAmount: dto.terminalAmount ?? existing.terminalAmount,
          discountAmount: dto.discountAmount ?? existing.discountAmount,
          discountNote: dto.discountNote !== undefined ? dto.discountNote : existing.discountNote,
          mibAmount: dto.mibAmount ?? existing.mibAmount,
          mibNote: dto.mibNote !== undefined ? dto.mibNote : existing.mibNote,
          contractsCount: dto.contractsCount ?? existing.contractsCount,
          contractsAmount: dto.contractsAmount ?? existing.contractsAmount,
          notes: dto.notes !== undefined ? dto.notes : existing.notes,
        },
        include: {
          cashier: {
            select: { id: true, firstName: true, lastName: true, username: true, role: true },
          },
          branch: {
            select: { id: true, name: true },
          },
          approver: {
            select: { id: true, firstName: true, lastName: true, username: true, role: true },
          },
        },
      });
    }

    // Create new report for today
    return await this.prisma.debtCashierReport.create({
      data: {
        cashierId: finalUserId,
        branchId: branchId,
        reportDate: reportDate,
        cashAmount: dto.cashAmount || 0,
        click9905Amount: dto.click9905Amount || 0,
        bankAccountAmount: dto.bankAccountAmount || 0,
        onlineAmount: dto.onlineAmount || 0,
        terminalAmount: dto.terminalAmount || 0,
        discountAmount: dto.discountAmount || 0,
        discountNote: dto.discountNote || null,
        mibAmount: dto.mibAmount || 0,
        mibNote: dto.mibNote || null,
        contractsCount: dto.contractsCount || 0,
        contractsAmount: dto.contractsAmount || 0,
        notes: dto.notes || null,
        status: 'PENDING',
      },
      include: {
        cashier: {
          select: { id: true, firstName: true, lastName: true, username: true, role: true },
        },
        branch: {
          select: { id: true, name: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true, username: true, role: true },
        },
      },
    });
  }

  async getTodayReport(userId: number) {
    const reportDate = this.getTodayDate();
    const report = await this.prisma.debtCashierReport.findFirst({
      where: {
        cashierId: userId,
        reportDate: reportDate,
      },
      include: {
        cashier: {
          select: { id: true, firstName: true, lastName: true, username: true, role: true },
        },
        branch: {
          select: { id: true, name: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true, username: true, role: true },
        },
      },
    });

    return report || null;
  }

  async getAllReports(startDate?: string, endDate?: string, branchId?: number, cashierId?: number) {
    const where: any = {};

    if (startDate || endDate) {
      where.reportDate = {};
      if (startDate) {
        const sStr = startDate.split('T')[0];
        where.reportDate.gte = new Date(`${sStr}T00:00:00.000Z`);
      }
      if (endDate) {
        const eStr = endDate.split('T')[0];
        where.reportDate.lte = new Date(`${eStr}T23:59:59.999Z`);
      }
    }

    if (branchId) where.branchId = Number(branchId);
    if (cashierId) where.cashierId = Number(cashierId);

    return await this.prisma.debtCashierReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        cashier: {
          select: { id: true, firstName: true, lastName: true, username: true, role: true },
        },
        branch: {
          select: { id: true, name: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true, username: true, role: true },
        },
      },
    });
  }

  async approveReport(id: number, approverId: number, dto: ApproveDebtCashierReportDto) {
    const report = await this.prisma.debtCashierReport.findUnique({
      where: { id: Number(id) },
    });

    if (!report) {
      throw new NotFoundException('Насия ҳисоботи топилмади.');
    }

    const acceptedCash = dto.acceptedCashAmount ?? (report.acceptedCashAmount ?? report.cashAmount);
    const acceptedClick = dto.acceptedClick9905Amount ?? (report.acceptedClick9905Amount ?? report.click9905Amount);
    const acceptedBank = dto.acceptedBankAccountAmount ?? (report.acceptedBankAccountAmount ?? report.bankAccountAmount);
    const acceptedOnline = dto.acceptedOnlineAmount ?? (report.acceptedOnlineAmount ?? report.onlineAmount);
    const acceptedTerminal = dto.acceptedTerminalAmount ?? (report.acceptedTerminalAmount ?? report.terminalAmount);
    const acceptedMib = dto.acceptedMibAmount ?? (report.acceptedMibAmount ?? report.mibAmount);

    const updatedReport = await this.prisma.debtCashierReport.update({
      where: { id: Number(id) },
      data: {
        status: 'APPROVED',
        acceptedCashAmount: acceptedCash,
        acceptedClick9905Amount: acceptedClick,
        acceptedBankAccountAmount: acceptedBank,
        acceptedOnlineAmount: acceptedOnline,
        acceptedTerminalAmount: acceptedTerminal,
        acceptedMibAmount: acceptedMib,
        accountantNotes: dto.accountantNotes !== undefined ? dto.accountantNotes : report.accountantNotes,
        approvedBy: approverId,
        approvedAt: new Date(),
      },
      include: {
        cashier: {
          select: { id: true, firstName: true, lastName: true, username: true, role: true },
        },
        branch: {
          select: { id: true, name: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true, username: true, role: true },
        },
      },
    });

    // ALSO sync/upsert into CashReconciliation for accounting & audit!
    try {
      const expectedTotal = report.cashAmount + report.click9905Amount + report.bankAccountAmount + report.onlineAmount + report.terminalAmount + report.mibAmount;
      const receivedTotal = acceptedCash + acceptedClick + acceptedBank + acceptedOnline + acceptedTerminal + acceptedMib;
      const diff = receivedTotal - expectedTotal;

      let statusVal: any = 'PENDING';
      if (diff === 0) statusVal = 'MATCHED';
      else if (diff < 0) statusVal = 'SHORTAGE';
      else if (diff > 0) statusVal = 'OVERAGE';

      const existingRec = await this.prisma.cashReconciliation.findFirst({
        where: {
          cashierId: report.cashierId,
          branchId: report.branchId,
          reportDate: report.reportDate,
        },
      });

      const detailsList = [
        { paymentType: 'CASH', expectedAmount: report.cashAmount, actualAmount: acceptedCash, difference: acceptedCash - report.cashAmount },
        { paymentType: 'CARD', expectedAmount: report.click9905Amount, actualAmount: acceptedClick, difference: acceptedClick - report.click9905Amount },
        { paymentType: 'BANK', expectedAmount: report.bankAccountAmount, actualAmount: acceptedBank, difference: acceptedBank - report.bankAccountAmount },
        { paymentType: 'TERMINAL', expectedAmount: report.terminalAmount, actualAmount: acceptedTerminal, difference: acceptedTerminal - report.terminalAmount },
        { paymentType: 'ADVANCE_PAYMENT', expectedAmount: report.mibAmount, actualAmount: acceptedMib, difference: acceptedMib - report.mibAmount },
      ];

      if (existingRec) {
        await this.prisma.cashReconciliation.update({
          where: { id: existingRec.id },
          data: {
            expectedCash: expectedTotal,
            receivedCash: receivedTotal,
            differenceAmount: diff,
            status: statusVal,
            notes: dto.accountantNotes || report.notes,
            approvedBy: approverId,
            approvedAt: new Date(),
          },
        });
      } else {
        await this.prisma.cashReconciliation.create({
          data: {
            cashierId: report.cashierId,
            branchId: report.branchId,
            reportDate: report.reportDate,
            expectedCash: expectedTotal,
            receivedCash: receivedTotal,
            differenceAmount: diff,
            status: statusVal,
            notes: dto.accountantNotes || report.notes,
            approvedBy: approverId,
            approvedAt: new Date(),
            details: {
              create: detailsList.map(d => ({
                paymentType: d.paymentType as any,
                expectedAmount: d.expectedAmount,
                actualAmount: d.actualAmount,
                difference: d.difference,
              })),
            },
          },
        });
      }
    } catch (recErr) {
      console.warn('Failed to sync CashReconciliation:', recErr);
    }

    return updatedReport;
  }
}
