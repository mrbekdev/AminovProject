import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncomingStockReportDto, IncomingReportStatusDto } from './dto/create-report.dto';
import { IncomingStockReportStatus, IncomingStockAuditAction, IncomingStockItemStatus, UserRole, TransactionType, TransactionStatus } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class IncomingStockService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Excel File Validation & Preview ───────────────────────────────────────
  async validateExcel(file: Express.Multer.File, branchId: number) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Fayl yuklanmadi yoki bo\'sh.');
    }

    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      const errors: string[] = [];
      const preview: any[] = [];
      const barcodesInFile = new Set<string>();

      // Load all products in the branch to check existence and current stock
      const products = await this.prisma.product.findMany({
        where: { branchId, isDeleted: false },
      });

      const productMap = new Map<string, any>();
      products.forEach((p) => {
        if (p.barcode) productMap.set(p.barcode.trim(), p);
      });

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2; // 1-based index, row 1 is header

        const rawBarcode = row['Barcode'] || row['barcode'];
        const productName = row['Product Name'] || row['product name'] || row['productName'] || row['Name'] || row['name'] || '';
        const rawQuantity = row['Quantity'] || row['quantity'];
        const note = row['Note'] || row['note'] || '';

        const barcode = rawBarcode ? String(rawBarcode).trim() : '';

        // 1. Check empty barcode
        if (!barcode) {
          errors.push(`Qator ${rowNumber}: Shtrix-kod bo'sh bo'lishi mumkin emas.`);
          continue;
        }

        // 2. Check empty or invalid quantity
        if (rawQuantity === undefined || rawQuantity === null || rawQuantity === '') {
          errors.push(`Qator ${rowNumber}: Miqdor bo'sh bo'lishi mumkin emas.`);
          continue;
        }

        const quantity = Number(rawQuantity);
        if (isNaN(quantity) || quantity <= 0) {
          errors.push(`Qator ${rowNumber}: Miqdor noldan katta butun son bo'lishi shart.`);
          continue;
        }

        // 3. Check duplicate barcode inside Excel
        if (barcodesInFile.has(barcode)) {
          errors.push(`Qator ${rowNumber}: Excel faylida takrorlangan shtrix-kod (${barcode}).`);
          continue;
        }
        barcodesInFile.add(barcode);

        // 4. Check if barcode exists in database
        const product = productMap.get(barcode);
        if (!product) {
          errors.push(`Qator ${rowNumber}: Ushbu shtrix-kod (${barcode}) bo'yicha mahsulot topilmadi.`);
          continue;
        }

        preview.push({
          barcode,
          productId: product.id,
          productName: product.name,
          currentStock: product.quantity,
          incomingQuantity: quantity,
          newStockAfterApproval: product.quantity + quantity,
          note: note ? String(note) : null,
          status: 'Valid',
        });
      }

      return {
        valid: errors.length === 0,
        errors,
        preview,
      };
    } catch (error) {
      throw new BadRequestException('Excel faylini o\'qishda xatolik: ' + error.message);
    }
  }

  // ─── Generate Sequential/Unique Report Number ──────────────────────────────
  private async generateReportNumber(): Promise<string> {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `ISR-${yyyymmdd}`;

    const count = await this.prisma.incomingStockReport.count({
      where: {
        reportNumber: {
          startsWith: prefix,
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}-${sequence}`;
  }

  // ─── Create Incoming Stock Report ──────────────────────────────────────────
  async createReport(dto: CreateIncomingStockReportDto, userId: number) {
    const reportNumber = await this.generateReportNumber();

    const totalQuantity = dto.items.reduce((sum, item) => sum + item.quantity, 0);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Report
      const report = await tx.incomingStockReport.create({
        data: {
          reportNumber,
          branchId: dto.branchId,
          createdBy: userId,
          status: dto.status as IncomingStockReportStatus,
          note: dto.note,
          totalItems: dto.items.length,
          totalQuantity,
          submittedAt: dto.status === IncomingReportStatusDto.PENDING ? new Date() : null,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              barcode: item.barcode,
              quantity: item.quantity,
              note: item.note,
            })),
          },
        },
      });

      // 2. Audit Log
      await tx.incomingStockAuditLog.create({
        data: {
          reportId: report.id,
          userId,
          action: IncomingStockAuditAction.CREATED,
          newValue: JSON.stringify({ status: report.status, totalQuantity }),
        },
      });

      if (dto.status === IncomingReportStatusDto.PENDING) {
        await tx.incomingStockAuditLog.create({
          data: {
            reportId: report.id,
            userId,
            action: IncomingStockAuditAction.SUBMITTED,
          },
        });

        // 3. Notify Admins
        await this.notifyAdmins(
          tx,
          `Yangi kirim hisoboti topshirildi`,
          `Auditor tomonidan yangi kirim hisoboti topshirildi: ${reportNumber} (Filiyal ID: ${dto.branchId})`
        );
      }

      return report;
    });
  }

  // ─── Update/Edit Incoming Stock Report ──────────────────────────────────────
  async updateReport(id: number, dto: CreateIncomingStockReportDto, userId: number) {
    const report = await this.prisma.incomingStockReport.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!report) {
      throw new NotFoundException('Kirim hisoboti topilmadi.');
    }

    if (report.status !== IncomingStockReportStatus.DRAFT) {
      throw new BadRequestException('Faqat qoralama (Draft) holatidagi hisobotlarni tahrirlash mumkin.');
    }

    const totalQuantity = dto.items.reduce((sum, item) => sum + item.quantity, 0);

    return this.prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.incomingStockItem.deleteMany({
        where: { reportId: id },
      });

      // Update Report
      const updatedReport = await tx.incomingStockReport.update({
        where: { id },
        data: {
          branchId: dto.branchId,
          status: dto.status as IncomingStockReportStatus,
          note: dto.note,
          totalItems: dto.items.length,
          totalQuantity,
          submittedAt: dto.status === IncomingReportStatusDto.PENDING ? new Date() : null,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              barcode: item.barcode,
              quantity: item.quantity,
              note: item.note,
            })),
          },
        },
      });

      // Audit Log
      await tx.incomingStockAuditLog.create({
        data: {
          reportId: id,
          userId,
          action: IncomingStockAuditAction.UPDATED,
          newValue: JSON.stringify({ status: updatedReport.status, totalQuantity }),
        },
      });

      if (dto.status === IncomingReportStatusDto.PENDING) {
        await tx.incomingStockAuditLog.create({
          data: {
            reportId: id,
            userId,
            action: IncomingStockAuditAction.SUBMITTED,
          },
        });

        // Notify Admins
        await this.notifyAdmins(
          tx,
          `Yangi kirim hisoboti topshirildi`,
          `Auditor tomonidan yangi kirim hisoboti topshirildi: ${report.reportNumber}`
        );
      }

      return updatedReport;
    });
  }

  // ─── Submit Draft Report ───────────────────────────────────────────────────
  async submitReport(id: number, userId: number) {
    const report = await this.prisma.incomingStockReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Kirim hisoboti topilmadi.');
    }

    if (report.status !== IncomingStockReportStatus.DRAFT) {
      throw new BadRequestException('Hisobot allaqachon topshirilgan.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.incomingStockReport.update({
        where: { id },
        data: {
          status: IncomingStockReportStatus.PENDING,
          submittedAt: new Date(),
        },
      });

      await tx.incomingStockAuditLog.create({
        data: {
          reportId: id,
          userId,
          action: IncomingStockAuditAction.SUBMITTED,
        },
      });

      await this.notifyAdmins(
        tx,
        `Yangi kirim hisoboti topshirildi`,
        `Auditor tomonidan yangi kirim hisoboti topshirildi: ${report.reportNumber}`
      );

      return updated;
    });
  }

  // ─── Approve Incoming Stock Report (Admin Only) ────────────────────────────
  async approveReport(id: number, userId: number, itemIds?: number[]) {
    const report = await this.prisma.incomingStockReport.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!report) {
      throw new NotFoundException('Kirim hisoboti topilmadi.');
    }

    if (report.status !== IncomingStockReportStatus.PENDING) {
      throw new BadRequestException('Faqat PENDING holatidagi hisobotlarni tasdiqlash mumkin.');
    }

    // Determine which items to approve (only pending ones)
    const itemsToApprove = itemIds && itemIds.length > 0
      ? report.items.filter(item => itemIds.includes(item.id) && item.status === IncomingStockItemStatus.PENDING)
      : report.items.filter(item => item.status === IncomingStockItemStatus.PENDING);

    if (itemsToApprove.length === 0) {
      throw new BadRequestException('Tasdiqlash uchun kamida bitta kutilayotgan tovar tanlangan bo\'lishi shart.');
    }

    return this.prisma.$transaction(async (tx) => {
      const transactionItemsData: any[] = [];

      for (const item of itemsToApprove) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Mahsulot (ID: ${item.productId}) topilmadi.`);
        }

        // Increment stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });

        transactionItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          price: 0,
          total: 0,
        });
      }

      // Log in standard Transaction/TransactionItem structure
      const systemTransaction = await tx.transaction.create({
        data: {
          userId,
          soldByUserId: report.createdBy,
          fromBranchId: report.branchId,
          type: TransactionType.PURCHASE,
          status: TransactionStatus.COMPLETED,
          discount: 0,
          total: 0,
          finalTotal: 0,
          amountPaid: 0,
          remainingBalance: 0,
          description: `Kirim hisoboti tasdiqlandi: ${report.reportNumber} (Qisman)`,
          items: {
            create: transactionItemsData,
          },
        },
      });

      // Update approved items status in the report instead of deleting them
      await tx.incomingStockItem.updateMany({
        where: {
          id: {
            in: itemsToApprove.map(item => item.id),
          },
        },
        data: {
          status: IncomingStockItemStatus.APPROVED,
        },
      });

      // Check how many items are left in PENDING status in the report
      const remainingItemsCount = await tx.incomingStockItem.count({
        where: { 
          reportId: id,
          status: IncomingStockItemStatus.PENDING
        },
      });

      let approvedReport;
      if (remainingItemsCount === 0) {
        // All items approved, update report status to APPROVED
        approvedReport = await tx.incomingStockReport.update({
          where: { id },
          data: {
            status: IncomingStockReportStatus.APPROVED,
            approvedBy: userId,
            approvedAt: new Date(),
            // Maintain total count of items that was originally submitted
            totalItems: report.items.length,
            totalQuantity: report.items.reduce((sum, item) => sum + item.quantity, 0),
          },
        });
      } else {
        // Some items remain pending, keep report status PENDING
        approvedReport = report;
      }

      // Audit Log
      await tx.incomingStockAuditLog.create({
        data: {
          reportId: id,
          userId,
          action: IncomingStockAuditAction.APPROVED,
          newValue: JSON.stringify({ 
            transactionId: systemTransaction.id,
            approvedItemIds: itemsToApprove.map(item => item.id),
            remainingItemsCount
          }),
        },
      });

      // Notify Auditor (Report Creator)
      await tx.notification.create({
        data: {
          userId: report.createdBy,
          title: remainingItemsCount === 0 ? `Hisobotingiz tasdiqlandi` : `Hisobotingiz qisman tasdiqlandi`,
          message: remainingItemsCount === 0 
            ? `${report.reportNumber} sonli kirim hisoboti administrator tomonidan tasdiqlandi.`
            : `${report.reportNumber} sonli kirim hisobotidan ${itemsToApprove.length} ta tovar tasdiqlandi. Qolgan tovarlar tasdiq kutilmoqda.`,
          type: 'SUCCESS',
        },
      });

      return approvedReport;
    });
  }

  // ─── Reject Incoming Stock Report (Admin Only) ────────────────────────────
  async rejectReport(id: number, reason: string, userId: number, itemIds?: number[]) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('Rad etilish sababini kiritish majburiy.');
    }

    const report = await this.prisma.incomingStockReport.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!report) {
      throw new NotFoundException('Kirim hisoboti topilmadi.');
    }

    if (report.status !== IncomingStockReportStatus.PENDING) {
      throw new BadRequestException('Faqat PENDING holatidagi hisobotlarni rad etish mumkin.');
    }

    // Determine which items to reject (only pending ones)
    const itemsToReject = itemIds && itemIds.length > 0
      ? report.items.filter(item => itemIds.includes(item.id) && item.status === IncomingStockItemStatus.PENDING)
      : report.items.filter(item => item.status === IncomingStockItemStatus.PENDING);

    if (itemsToReject.length === 0) {
      throw new BadRequestException('Rad etish uchun kamida bitta kutilayotgan tovar tanlangan bo\'lishi shart.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update rejected items status instead of deleting them
      await tx.incomingStockItem.updateMany({
        where: {
          id: {
            in: itemsToReject.map(item => item.id),
          },
        },
        data: {
          status: IncomingStockItemStatus.REJECTED,
        },
      });

      const remainingItemsCount = await tx.incomingStockItem.count({
        where: { 
          reportId: id,
          status: IncomingStockItemStatus.PENDING
        },
      });

      let updatedReport;
      if (remainingItemsCount === 0) {
        const approvedCount = await tx.incomingStockItem.count({
          where: {
            reportId: id,
            status: IncomingStockItemStatus.APPROVED
          }
        });

        updatedReport = await tx.incomingStockReport.update({
          where: { id },
          data: {
            status: approvedCount > 0 ? IncomingStockReportStatus.APPROVED : IncomingStockReportStatus.REJECTED,
            approvedBy: userId,
            approvedAt: new Date(),
            note: report.note 
              ? `${report.note}\nRad etildi: ${reason}`
              : `Rad etildi: ${reason}`,
          },
        });
      } else {
        updatedReport = await tx.incomingStockReport.update({
          where: { id },
          data: {
            note: report.note 
              ? `${report.note}\nQisman rad etildi (${itemsToReject.length} ta tovar): ${reason}`
              : `Qisman rad etildi (${itemsToReject.length} ta tovar): ${reason}`,
          },
        });
      }

      // Audit Log
      await tx.incomingStockAuditLog.create({
        data: {
          reportId: id,
          userId,
          action: IncomingStockAuditAction.REJECTED,
          newValue: JSON.stringify({ 
            reason,
            rejectedItemIds: itemsToReject.map(item => item.id),
            remainingItemsCount 
          }),
        },
      });

      // Notify Creator
      await tx.notification.create({
        data: {
          userId: report.createdBy,
          title: remainingItemsCount === 0 ? `Hisobotingiz rad etildi` : `Hisobotingiz qisman rad etildi`,
          message: remainingItemsCount === 0 
            ? `${report.reportNumber} sonli kirim hisoboti administrator tomonidan rad etildi. Sababi: ${reason}`
            : `${report.reportNumber} sonli kirim hisobotidan ${itemsToReject.length} ta tovar rad etildi. Sababi: ${reason}`,
          type: 'ERROR',
        },
      });

      return updatedReport;
    });
  }

  // ─── List Reports ──────────────────────────────────────────────────────────
  async findAll(query: any, user: any) {
    const where: any = {};

    // auditor only views their own reports
    if (user.role === UserRole.REVIZOR) {
      where.createdBy = user.userId;
    } else if (query.createdBy) {
      where.createdBy = parseInt(query.createdBy);
    }

    if (query.branchId) {
      where.branchId = parseInt(query.branchId);
    }

    if (query.status) {
      where.status = query.status as IncomingStockReportStatus;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Filter reports that contain a specific product
    if (query.productId) {
      where.items = {
        some: {
          productId: parseInt(query.productId),
        },
      };
    }

    if (query.search) {
      where.reportNumber = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      this.prisma.incomingStockReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { id: true, name: true } },
          creator: { select: { id: true, firstName: true, lastName: true, username: true } },
          approver: { select: { id: true, firstName: true, lastName: true } },
          ...(query.productId ? {
            items: {
              where: { productId: parseInt(query.productId) },
              select: { id: true, productId: true, quantity: true, note: true, status: true, createdAt: true },
            },
          } : {}),
        },
      }),
      this.prisma.incomingStockReport.count({ where }),
    ]);

    // Statistics
    let stats: any = null;
    if (user.role === UserRole.ADMIN) {
      const allStats = await this.prisma.incomingStockReport.groupBy({
        by: ['status'],
        _count: true,
        _sum: {
          totalQuantity: true,
        },
      });
      stats = allStats;
    }

    return {
      reports,
      total,
      page,
      limit,
      stats,
    };
  }

  // ─── Find One Detail ───────────────────────────────────────────────────────
  async findOne(id: number, user: any) {
    const report = await this.prisma.incomingStockReport.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        creator: { select: { id: true, firstName: true, lastName: true, username: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, quantity: true } },
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Kirim hisoboti topilmadi.');
    }

    // Role security
    if (user.role === UserRole.REVIZOR && report.createdBy !== user.userId) {
      throw new ForbiddenException('Siz ushbu hisobot tafsilotlarini ko\'ra olmaysiz.');
    }

    return report;
  }

  // ─── Notifications List & Mark Read ────────────────────────────────────────
  async getNotifications(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markNotificationAsRead(id: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Bildirishnoma topilmadi.');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllNotificationsAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // ─── Helper: Send Admin Notifications ──────────────────────────────────────
  private async notifyAdmins(tx: any, title: string, message: string) {
    const admins = await tx.user.findMany({
      where: { role: UserRole.ADMIN, status: 'ACTIVE' },
      select: { id: true },
    });

    const notificationsData = admins.map((admin) => ({
      userId: admin.id,
      title,
      message,
      type: 'INFO',
    }));

    if (notificationsData.length > 0) {
      await tx.notification.createMany({
        data: notificationsData,
      });
    }
  }
}
