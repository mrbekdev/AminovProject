import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, TransactionStatus, PaymentType, TaskStatus, UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(branchId?: number, period?: string, startDate?: string, endDate?: string, customerSortBy?: string) {
    // 1. Calculate date boundaries
    let start = new Date();
    let end = new Date();
    const outstandingByBranch = new Map<number, number>();

    if (period) {
      start = new Date();
      end = new Date();
      if (period === 'today') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (period === 'yesterday') {
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
      } else if (period === 'week') {
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (period === 'month') {
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (period === 'year') {
        start.setFullYear(start.getFullYear() - 1);     
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      }
    } else {
      if (startDate) {
        // Use same UTC+5 (Tashkent) timezone-aware parsing as getUserReport
        start = new Date(startDate);
        const isUTC = startDate.endsWith('Z') || startDate.includes('+');
        if (!isUTC) {
          start.setUTCHours(start.getUTCHours() - 5);
        }
      } else {
        // Fallback to start of time
        start = new Date('2000-01-01T00:00:00.000Z');
      }
      if (endDate) {
        // Use same UTC+5 (Tashkent) timezone-aware parsing as getUserReport
        end = new Date(endDate);
        const isUTC = endDate.endsWith('Z') || endDate.includes('+');
        if (!isUTC) {
          end.setUTCDate(end.getUTCDate() + 1);
          end.setUTCHours(end.getUTCHours() - 5);
          end.setTime(end.getTime() - 1);
        }
      } else {
        end = new Date();
      }
    }

    // Common WHERE clause for transactions
    const transactionWhere: any = {     
      status: { not: TransactionStatus.CANCELLED },
    };
    if (branchId) {
      transactionWhere.OR = [
        { fromBranchId: branchId },
        { toBranchId: branchId },
      ];
    }
    transactionWhere.createdAt = {
      gte: start,
      lte: end,
    };

    // Common WHERE clause for repayments
    const repaymentWhere: any = {};
    if (branchId) {
      repaymentWhere.branchId = branchId;
    }
    repaymentWhere.paidAt = {
      gte: start,
      lte: end,
    };

    // 2. Query Cash Register (Kassa)
    // Fetch all active SALE transactions with their payments breakdown
    const activeSales = await this.prisma.transaction.findMany({
      where: {
        ...transactionWhere,
        type: TransactionType.SALE,
      },
      include: {
        payments: true,
      },
    });

    let cashSales = 0;
    let cardSales = 0;
    let terminalSales = 0;
    let creditSales = 0;
    let installmentSales = 0;
    let uydanSales = 0;
    let thirdPartySales = 0;
    let tovarSales = 0;
    let totalSales = 0;

    const normalizePaymentType = (raw?: string | null) => {
      const t = String(raw || '').toUpperCase().trim();
      if (!t) return null;
      if (['CASH', 'NAQD', 'NAL'].includes(t)) return 'CASH';
      if (['CARD', 'ICAN', 'PLASTIC', 'PLASTIK'].includes(t)) return 'CARD';
      if (['TERMINAL', 'POS', 'TRANSFER', 'BANK', 'CLICK', 'PAYME'].includes(t)) return 'TERMINAL';
      if (['CREDIT', 'DEBT'].includes(t)) return 'CREDIT';
      if (['INSTALLMENT', 'BOLOB', "BO'LIB"].includes(t)) return 'INSTALLMENT';
      if (['UYDAN', 'HOME'].includes(t)) return 'UYDAN';
      if (['THIRD_PARTY'].includes(t)) return 'THIRD_PARTY';
      if (['TOVAR'].includes(t)) return 'TOVAR';
      return t;
    };

    activeSales.forEach(t => {
      const finalTotal = t.finalTotal || t.total || 0;
      totalSales += finalTotal;

      const hasSplitPayments = Array.isArray(t.payments) && t.payments.length > 0;

      if (hasSplitPayments) {
        const seenPaymentSignatures = new Set<string>();
        t.payments.forEach(p => {
          const m = String(p.method || '').toUpperCase();
          const amt = Number(p.amount || 0);
          const sig = `${m}:${amt}:${p.id}`;
          if (seenPaymentSignatures.has(sig)) return;
          seenPaymentSignatures.add(sig);

          if (m === 'CASH') cashSales += amt;
          else if (m === 'CARD') cardSales += amt;
          else if (m === 'TERMINAL') terminalSales += amt;
          else if (m === 'UYDAN') uydanSales += amt;
          else if (m === 'CREDIT') creditSales += amt;
          else if (m === 'INSTALLMENT') installmentSales += amt;
          else if (m === 'THIRD_PARTY') thirdPartySales += amt;
          else if (m === 'TOVAR') tovarSales += amt;
        });
      } else {
        const mainType = normalizePaymentType(t.paymentType);
        
        // For debt calculation without payments array:
        const isDebtType = ['CREDIT', 'INSTALLMENT', 'UYDAN'].includes(mainType || '');
        if (isDebtType) {
          const paidAmount = Number(t.downPayment || t.amountPaid || 0);
          const remainingAmount = Math.max(0, finalTotal - paidAmount);

          if (mainType === 'CREDIT') creditSales += remainingAmount;
          else if (mainType === 'INSTALLMENT') installmentSales += remainingAmount;
          else if (mainType === 'UYDAN') uydanSales += remainingAmount;

          const upfront = String(t.upfrontPaymentType || 'CASH').toUpperCase();
          if (upfront === 'CASH') cashSales += paidAmount;
          else if (upfront === 'CARD') cardSales += paidAmount;
          else if (upfront === 'TERMINAL') terminalSales += paidAmount;
          else if (upfront === 'THIRD_PARTY') thirdPartySales += paidAmount;
          else cashSales += paidAmount;
        } else {
          // Non-debt transaction
          if (mainType === 'CASH') cashSales += finalTotal;
          else if (mainType === 'CARD') cardSales += finalTotal;
          else if (mainType === 'TERMINAL') terminalSales += finalTotal;
          else if (mainType === 'THIRD_PARTY') thirdPartySales += finalTotal;
          else if (mainType === 'TOVAR') tovarSales += finalTotal;
          else cashSales += finalTotal; // Default to cash
        }
      }
    });

    // Repayments (creditRepayment & dailyRepayment)
    let creditRepaymentsCash = 0;
    let creditRepaymentsCard = 0;
    let dailyRepaymentsCash = 0;
    let dailyRepaymentsCard = 0;

    try {
      const creditRepaymentsGroup = await this.prisma.creditRepayment.groupBy({
        by: ['channel'],
        where: repaymentWhere,
        _sum: { amount: true },
      });
      creditRepaymentsCash = creditRepaymentsGroup.find(r => r.channel === 'CASH')?._sum.amount || 0;
      creditRepaymentsCard = creditRepaymentsGroup.find(r => r.channel === 'CARD')?._sum.amount || 0;
    } catch (e) {
      console.error('Credit repayment aggregation failed', e);
    }

    try {
      const dailyRepaymentsGroup = await this.prisma.dailyRepayment.groupBy({
        by: ['channel'],
        where: repaymentWhere,
        _sum: { amount: true },
      });
      dailyRepaymentsCash = dailyRepaymentsGroup.find(r => r.channel === 'CASH')?._sum.amount || 0;
      dailyRepaymentsCard = dailyRepaymentsGroup.find(r => r.channel === 'CARD')?._sum.amount || 0;
    } catch (e) {
      console.error('Daily repayment aggregation failed', e);
    }

    const totalRepaymentsCash = creditRepaymentsCash + dailyRepaymentsCash;
    const totalRepaymentsCard = creditRepaymentsCard + dailyRepaymentsCard;

    // Current cash balance of selected branch or aggregate
    let cashBalance = 0;
    if (branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { cashBalance: true },
      });
      cashBalance = branch?.cashBalance || 0;
    } else {
      const branchAgg = await this.prisma.branch.aggregate({
        _sum: { cashBalance: true },
      });
      cashBalance = branchAgg._sum.cashBalance || 0;
    }

    // 3. Query Top Employee (Топовой ходим)
    const employeeSales = await this.prisma.transaction.groupBy({
      by: ['soldByUserId'],
      where: {
        ...transactionWhere,
        type: TransactionType.SALE,
        soldByUserId: { not: null },
      },
      _sum: {
        finalTotal: true,
        extraProfit: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          finalTotal: 'desc',
        },
      },
      take: 10,
    });

    const employeeIds = employeeSales.map(es => es.soldByUserId).filter((id): id is number => id !== null);
    const users = await this.prisma.user.findMany({
      where: { id: { in: employeeIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
      },
    });

    // Fetch transactions for the top employees within date range (and optionally branchId)
    // exactly like getUserReport (checking both soldByUserId and userId)
    const employeeTransactions = await this.prisma.transaction.findMany({
      where: {
        OR: [
          { soldByUserId: { in: employeeIds } },
          { userId: { in: employeeIds } },
        ],
        createdAt: {
          gte: start,
          lte: end,
        },
        ...(branchId ? {
          AND: [
            {
              OR: [
                { fromBranchId: branchId },
                { toBranchId: branchId },
              ]
            }
          ]
        } : {}),
      },
      select: {
        id: true,
        soldByUserId: true,
        userId: true,
        finalTotal: true,
        extraProfit: true,
      },
    });

    // Fetch bonuses (KPI) for the top employees within date range (and branchId if set)
    // exactly like getUserReport
    const employeeBonuses = await this.prisma.bonus.findMany({
      where: {
        userId: { in: employeeIds },
        createdAt: {
          gte: start,
          lte: end,
        },
        ...(branchId ? { branchId } : {}),
      },
      select: {
        userId: true,
        amount: true,
        description: true,
      },
    });

    const topEmployees = employeeSales.map(es => {
      const uId = es.soldByUserId as number;
      const user = users.find(u => u.id === uId);
      const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown';
      
      // Filter transactions for this specific employee to compute salesCount
      const userTxs = employeeTransactions.filter(tx => tx.soldByUserId === uId || tx.userId === uId);
      const salesCount = userTxs.length;

      // Filter bonuses for this specific employee
      const userBonuses = employeeBonuses.filter(b => b.userId === uId);
      const totalBonuses = userBonuses.reduce((sum, b) => sum + (b.amount || 0), 0);

      // Parse Sotish narxi and Sof ortiqcha from bonuses to compute totalSales and totalProfit
      let totalSales = 0;
      let totalProfit = 0;
      for (const b of userBonuses) {
        if (b.description) {
          const matchSales = b.description.match(/Sotish narxi:\s*([\d,.-]+)/i);
          if (matchSales) {
            const valStr = matchSales[1].replace(/,/g, '');
            totalSales += parseFloat(valStr) || 0;
          }
          const matchProfit = b.description.match(/Sof ortiqcha:\s*([\d,.-]+)/i);
          if (matchProfit) {
            const valStr = matchProfit[1].replace(/,/g, '');
            totalProfit += parseFloat(valStr) || 0;
          }
        }
      }

      return {
        userId: uId,
        fullName: name,
        username: user?.username || '',
        phone: user?.phone || '',
        salesVolume: totalSales,
        salesCount: salesCount,
        kpi: totalBonuses,
        netProfit: totalProfit,
      };
    });

    // Sort by salesVolume descending to ensure they are ranked correctly based on the new logic
    topEmployees.sort((a, b) => b.salesVolume - a.salesVolume);

    // 4. Query Top Product (топовой тавар)
    const productSales = await this.prisma.transactionItem.groupBy({
      by: ['productId'],
      where: {
        transaction: {
          ...transactionWhere,
          type: TransactionType.SALE,
        },
        productId: { not: null },
      },
      _sum: {
        quantity: true,
        total: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10,
    });

    const productIds = productSales.map(ps => ps.productId).filter((id): id is number => id !== null);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        model: true,
        barcode: true,
        price: true,
      },
    });

    // Payment type breakdown per product
    const productPaymentBreakdown = await Promise.all(
      productIds.map(async (productId) => {
        const breakdown = await this.prisma.transactionItem.groupBy({
          by: ['transactionId'],
          where: {
            productId,
            transaction: {
              ...transactionWhere,
              type: TransactionType.SALE,
            },
          },
          _sum: {
            quantity: true,
          },
        });

        const transactionIds = breakdown.map(b => b.transactionId);
        const transactions = transactionIds.length > 0
          ? await this.prisma.transaction.findMany({
              where: { id: { in: transactionIds } },
              select: { id: true, paymentType: true },
            })
          : [];

        let cashCount = 0;
        let cardCount = 0;
        let creditCount = 0;

        for (const b of breakdown) {
          const tx = transactions.find(t => t.id === b.transactionId);
          const qty = b._sum.quantity || 0;
          if (tx) {
            if (tx.paymentType === PaymentType.CASH) {
              cashCount += qty;
            } else if (tx.paymentType === PaymentType.CARD || tx.paymentType === PaymentType.TERMINAL) {
              cardCount += qty;
            } else if (tx.paymentType === PaymentType.CREDIT || tx.paymentType === PaymentType.INSTALLMENT) {
              creditCount += qty;
            }
          }
        }

        return { productId, cashCount, cardCount, creditCount };
      })
    );

    const topProducts = productSales.map(ps => {
      const prod = products.find(p => p.id === ps.productId);
      const payBreakdown = productPaymentBreakdown.find(pb => pb.productId === ps.productId);
      return {
        productId: ps.productId,
        name: prod?.name || 'Unknown',
        model: prod?.model || '',
        barcode: prod?.barcode || '',
        price: prod?.price || 0,
        quantitySold: ps._sum.quantity || 0,
        totalRevenue: ps._sum.total || 0,
        cashCount: payBreakdown?.cashCount || 0,
        cardCount: payBreakdown?.cardCount || 0,
        creditCount: payBreakdown?.creditCount || 0,
      };
    });

    // 5. Query Top Customer (топовой мижоз)
    const customerSales = await this.prisma.transaction.groupBy({
      by: ['customerId'],
      where: {
        ...transactionWhere,
        type: TransactionType.SALE,
        customerId: { not: null },
      },
      _sum: {
        finalTotal: true,
        extraProfit: true,
      },
      _count: {
        id: true,
      },
      orderBy: customerSortBy === 'count' ? {
        _count: {
          id: 'desc',
        },
      } : {
        _sum: {
          finalTotal: 'desc',
        },
      },
      take: 10,
    });

    const customerIds = customerSales.map(cs => cs.customerId).filter((id): id is number => id !== null);
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
      },
    });

    const topCustomers = customerSales.map(cs => {
      const cust = customers.find(c => c.id === cs.customerId);
      return {
        customerId: cs.customerId,
        fullName: cust?.fullName || 'Unknown',
        phone: cust?.phone || '',
        email: cust?.email || '',
        totalSpent: cs._sum.finalTotal || 0,
        ordersCount: cs._count.id || 0,
        netProfit: cs._sum.extraProfit || 0,
      };
    });

    // 6. Query Delivery stats (достафка)
    const taskWhere: any = {};
    if (branchId) {
      taskWhere.transaction = {
        fromBranchId: branchId,
      };
    }
    taskWhere.createdAt = {
      gte: start,
      lte: end,
    };

    const tasksGroup = await this.prisma.task.groupBy({
      by: ['status'],
      where: taskWhere,
      _count: { id: true },
    });

    const pendingDeliveries = tasksGroup.find(t => t.status === TaskStatus.PENDING)?._count.id || 0;
    const acceptedDeliveries = tasksGroup.find(t => t.status === TaskStatus.ACCEPTED)?._count.id || 0;
    const completedDeliveriesCount = tasksGroup.find(t => t.status === TaskStatus.DELIVERED)?._count.id || 0;
    const totalDeliveries = pendingDeliveries + acceptedDeliveries + completedDeliveriesCount;

    // Drivers deliveries
    const driverDeliveries = await this.prisma.task.groupBy({
      by: ['auditorId'],
      where: {
        ...taskWhere,
        status: TaskStatus.DELIVERED,
        auditorId: { not: null },
      },
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' },
      },
      take: 10,
    });

    const driverIds = driverDeliveries.map(dd => dd.auditorId).filter((id): id is number => id !== null);
    const drivers = await this.prisma.user.findMany({
      where: { id: { in: driverIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
      },
    });

    const driverRatings = await this.prisma.driverRating.groupBy({
      by: ['driverId'],
      _avg: { rating: true },
      _count: { id: true },
    });

    const topDrivers = driverDeliveries.map(dd => {
      const driver = drivers.find(d => d.id === dd.auditorId);
      const name = driver ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || driver.username : 'Unknown';
      const ratingInfo = driverRatings.find(dr => dr.driverId === dd.auditorId);
      return {
        driverId: dd.auditorId,
        fullName: name,
        username: driver?.username || '',
        phone: driver?.phone || '',
        completedDeliveries: dd._count.id || 0,
        averageRating: ratingInfo?._avg.rating ? Number(ratingInfo._avg.rating.toFixed(1)) : 5.0,
        ratingCount: ratingInfo?._count.id || 0,
      };
    });

    // --- NEW DETAILED DELIVERY STATS ---
    const tasks = await this.prisma.task.findMany({
      where: taskWhere,
      include: {
        auditor: true,
        transaction: {
          include: {
            items: true,
          }
        }
      }
    });

    // 1) 5-status order breakdown
    const orderStatuses = {
      pending: 0,
      accepted: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const t of tasks) {
      if (t.transaction?.status === 'CANCELLED') {
        orderStatuses.cancelled++;
      } else if (t.status === 'DELIVERED') {
        orderStatuses.completed++;
      } else if (t.status === 'ACCEPTED') {
        orderStatuses.inProgress++;
      } else if (t.status === 'PENDING') {
        if (t.auditorId !== null) {
          orderStatuses.accepted++;
        } else {
          orderStatuses.pending++;
        }
      }
    }

    // 2) Last 30 days daily stats
    const dailyStats: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyStats.push({
        date: dateStr,
        accepted: 0,
        completed: 0,
        cancelled: 0,
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    for (const t of tasks) {
      if (t.createdAt >= thirtyDaysAgo) {
        const dateStr = t.createdAt.toISOString().split('T')[0];
        const entry = dailyStats.find(d => d.date === dateStr);
        if (entry) {
          if (t.transaction?.status === 'CANCELLED') {
            entry.cancelled++;
          } else {
            entry.accepted++;
            if (t.status === 'DELIVERED') {
              entry.completed++;
            }
          }
        }
      }
    }

    // 3) Last 12 months monthly stats
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const yearTasks = await this.prisma.task.findMany({
      where: {
        createdAt: { gte: twelveMonthsAgo }
      },
      select: {
        status: true,
        createdAt: true,
      }
    });

    const monthlyStats: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toISOString().substring(0, 7); // YYYY-MM
      monthlyStats.push({
        month: monthStr,
        total: 0,
        completed: 0,
      });
    }

    for (const t of yearTasks) {
      const monthStr = t.createdAt.toISOString().substring(0, 7);
      const entry = monthlyStats.find(m => m.month === monthStr);
      if (entry) {
        entry.total++;
        if (t.status === 'DELIVERED') {
          entry.completed++;
        }
      }
    }

    // 4) Auditor Speed (Top 10 Fastest)
    const auditorSpeedMap = new Map<number, any>();
    const allCompletedTasks = await this.prisma.task.findMany({
      where: {
        status: 'DELIVERED',
        auditorId: { not: null },
      },
      include: {
        auditor: true,
      }
    });

    for (const task of allCompletedTasks) {
      const durationMs = task.updatedAt.getTime() - task.createdAt.getTime();
      const durationMin = Math.max(0, durationMs / (1000 * 60));

      if (!auditorSpeedMap.has(task.auditorId as number)) {
        auditorSpeedMap.set(task.auditorId as number, {
          id: task.auditorId as number,
          fullName: task.auditor ? `${task.auditor.firstName || ''} ${task.auditor.lastName || ''}`.trim() || task.auditor.username : 'Unknown',
          totalMinutes: 0,
          count: 0,
        });
      }
      const speedStats = auditorSpeedMap.get(task.auditorId as number);
      speedStats.totalMinutes += durationMin;
      speedStats.count++;
    }

    const fastestAuditors = Array.from(auditorSpeedMap.values())
      .map(aud => ({
        id: aud.id,
        fullName: aud.fullName,
        avgTimeMin: Math.round(aud.totalMinutes / aud.count),
        completedCount: aud.count,
      }))
      .sort((a, b) => a.avgTimeMin - b.avgTimeMin)
      .slice(0, 10);

    // 5) Auditor Activity (Top 10 Most Active)
    const auditorWorkMap = new Map<number, any>();
    const allAuditorTasks = await this.prisma.task.findMany({
      where: {
        auditorId: { not: null },
      },
      include: {
        auditor: true,
        transaction: {
          include: {
            items: true,
          }
        }
      }
    });

    for (const task of allAuditorTasks) {
      const dateStr = task.createdAt.toISOString().split('T')[0];
      const itemsCount = task.status === 'DELIVERED' && task.transaction
        ? task.transaction.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
        : 0;
      const isCompleted = task.status === 'DELIVERED';

      if (!auditorWorkMap.has(task.auditorId as number)) {
        auditorWorkMap.set(task.auditorId as number, {
          id: task.auditorId as number,
          fullName: task.auditor ? `${task.auditor.firstName || ''} ${task.auditor.lastName || ''}`.trim() || task.auditor.username : 'Unknown',
          acceptedCount: 0,
          completedCount: 0,
          uniqueDays: new Set(),
          totalProducts: 0,
        });
      }
      const workStats = auditorWorkMap.get(task.auditorId as number);
      workStats.uniqueDays.add(dateStr);
      workStats.acceptedCount++;
      if (isCompleted) {
        workStats.completedCount++;
        workStats.totalProducts += itemsCount;
      }
    }

    const mostActiveAuditors = Array.from(auditorWorkMap.values())
      .map(aud => ({
        id: aud.id,
        fullName: aud.fullName,
        acceptedCount: aud.acceptedCount,
        completedCount: aud.completedCount,
        daysWorked: aud.uniqueDays.size,
        totalProducts: aud.totalProducts,
        efficiency: aud.acceptedCount > 0 ? Math.round((aud.completedCount / aud.acceptedCount) * 100) : 0,
      }))
      .sort((a, b) => b.acceptedCount - a.acceptedCount)
      .slice(0, 10);

    // 6) Region Stats (Branch stats)
    const branchStatsMap = new Map<number, any>();
    const branchesList = await this.prisma.branch.findMany({
      select: { id: true, name: true }
    });

    for (const b of branchesList) {
      branchStatsMap.set(b.id, {
        branchId: b.id,
        branchName: b.name,
        total: 0,
        completed: 0,
        cancelled: 0,
      });
    }

    for (const task of tasks) {
      const branchId = task.transaction?.fromBranchId;
      if (branchId && branchStatsMap.has(branchId)) {
        const stats = branchStatsMap.get(branchId);
        stats.total++;
        if (task.transaction?.status === 'CANCELLED') {
          stats.cancelled++;
        } else if (task.status === 'DELIVERED') {
          stats.completed++;
        }
      }
    }

    const branchStats = Array.from(branchStatsMap.values())
      .map(b => {
        const validTotal = b.total - b.cancelled;
        const efficiency = validTotal > 0 ? Math.round((b.completed / validTotal) * 100) : 0;
        return {
          ...b,
          efficiency,
        };
      })
      .filter(b => b.total > 0);

    // 7) Delivery speed analysis (overall)
    const durations: number[] = [];
    for (const task of tasks) {
      if (task.status === 'DELIVERED') {
        const durationMs = task.updatedAt.getTime() - task.createdAt.getTime();
        const durationMin = Math.max(0, durationMs / (1000 * 60));
        durations.push(durationMin);
      }
    }

    let fastest = 0;
    let slowest = 0;
    let average = 0;
    let median = 0;

    if (durations.length > 0) {
      durations.sort((a, b) => a - b);
      fastest = Math.round(durations[0]);
      slowest = Math.round(durations[durations.length - 1]);
      const sum = durations.reduce((s, v) => s + v, 0);
      average = Math.round(sum / durations.length);
      
      const mid = Math.floor(durations.length / 2);
      median = durations.length % 2 !== 0 
        ? Math.round(durations[mid]) 
        : Math.round((durations[mid - 1] + durations[mid]) / 2);
    }

    const deliveryTimeAnalysis = {
      fastest,
      slowest,
      average,
      median,
      count: durations.length
    };

    // 7. Calculate Cashier register balances (Kassirlar kassasidagi pullar)
    const cashierQuery: any = {
      role: UserRole.CASHIER,
      status: UserStatus.ACTIVE,
    };
    if (branchId) {
      cashierQuery.branchId = branchId;
    }
    const cashiers = await this.prisma.user.findMany({
      where: cashierQuery,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
      },
    });

    const cashierKassas = await Promise.all(
      cashiers.map(async (cashier) => {
        const sales = await this.prisma.transaction.findMany({
          where: {
            OR: [{ soldByUserId: cashier.id }, { userId: cashier.id }],
            type: TransactionType.SALE,
            status: { not: TransactionStatus.CANCELLED },
            createdAt: { gte: start, lte: end },
          },
          select: {
            finalTotal: true,
            paymentType: true,
            upfrontPaymentType: true,
            amountPaid: true,
            payments: {
              select: {
                method: true,
                amount: true,
              }
            }
          },
        });

        let totalCashSales = 0;
        let totalCardSales = 0;
        let totalTerminalSales = 0;
        let totalCreditSales = 0;
        let totalInstallmentSales = 0;

        for (const sale of sales) {
          const finalTotal = Number(sale.finalTotal || 0);
          const pType = String(sale.paymentType || '').toUpperCase();

          if (pType === 'CREDIT') {
            totalCreditSales += finalTotal;
          } else if (pType === 'INSTALLMENT') {
            totalInstallmentSales += finalTotal;
          }

          if (sale.payments && sale.payments.length > 0) {
            for (const p of sale.payments) {
              const amt = Number(p.amount || 0);
              if (!amt || Number.isNaN(amt)) continue;
              const m = String(p.method || '').toUpperCase();
              if (m === 'CASH') totalCashSales += amt;
              else if (m === 'CARD') totalCardSales += amt;
              else if (m === 'TERMINAL') totalTerminalSales += amt;
            }
          } else {
            if (pType === 'CASH') {
              totalCashSales += finalTotal;
            } else if (pType === 'CARD') {
              totalCardSales += finalTotal;
            } else if (pType === 'TERMINAL') {
              totalTerminalSales += finalTotal;
            } else if (pType === 'CREDIT' || pType === 'INSTALLMENT') {
              const upfront = Number(sale.amountPaid || 0);
              const upType = String(sale.upfrontPaymentType || 'CASH').toUpperCase();
              if (upType === 'CASH') {
                totalCashSales += upfront;
              } else if (upType === 'CARD') {
                totalCardSales += upfront;
              } else if (upType === 'TERMINAL') {
                totalTerminalSales += upfront;
              }
            }
          }
        }

        const crCash = await this.prisma.creditRepayment.aggregate({
          where: {
            paidByUserId: cashier.id,
            channel: 'CASH',
            paidAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
        });
        const crCard = await this.prisma.creditRepayment.aggregate({
          where: {
            paidByUserId: cashier.id,
            channel: 'CARD',
            paidAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
        });

        const drCash = await this.prisma.dailyRepayment.aggregate({
          where: {
            paidByUserId: cashier.id,
            channel: 'CASH',
            paidAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
        });
        const drCard = await this.prisma.dailyRepayment.aggregate({
          where: {
            paidByUserId: cashier.id,
            channel: 'CARD',
            paidAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
        });

        const cashierRepaymentsCash = (crCash._sum.amount || 0) + (drCash._sum.amount || 0);
        const cashierRepaymentsCard = (crCard._sum.amount || 0) + (drCard._sum.amount || 0);

        const totalCashInHand = totalCashSales + cashierRepaymentsCash;
        const totalCardInHand = totalCardSales + totalTerminalSales + cashierRepaymentsCard;

        return {
          cashierId: cashier.id,
          fullName: `${cashier.firstName || ''} ${cashier.lastName || ''}`.trim() || cashier.username,
          username: cashier.username,
          phone: cashier.phone || '',
          cashSales: totalCashSales,
          cardSales: totalCardSales,
          terminalSales: totalTerminalSales,
          creditSales: totalCreditSales + totalInstallmentSales,
          overallSales: sales.reduce((sum, s) => sum + Number(s.finalTotal || 0), 0),
          repaymentsCash: cashierRepaymentsCash,
          repaymentsCard: cashierRepaymentsCard,
          totalCash: totalCashInHand,
          totalCard: totalCardInHand,
          totalSum: totalCashInHand + totalCardInHand,
        };
      })
    );

    // Calculate cashier registers sum
    const cashierKassasTotal = {
      cash: cashierKassas.reduce((sum, c) => sum + (c.totalCash || 0), 0),
      card: cashierKassas.reduce((sum, c) => sum + (c.totalCard || 0), 0),
      total: cashierKassas.reduce((sum, c) => sum + (c.totalSum || 0), 0),
    };

    // Cumulative outstanding customer debts
    let totalOutstandingDebts = 0;
    try {
      const transactions = await this.prisma.transaction.findMany({
        where: {
          status: { not: TransactionStatus.CANCELLED },
          OR: [
            { paymentType: { in: [PaymentType.CREDIT, PaymentType.INSTALLMENT] } },
            { payments: { some: { method: { in: ['UYDAN', 'INSTALLMENT'] } } } }
          ],
          ...(branchId ? {
            AND: [
              {
                OR: [
                  { fromBranchId: branchId },
                  { toBranchId: branchId }
                ]
              }
            ]
          } : {})
        },
        select: {
          fromBranchId: true,
          finalTotal: true,
          total: true,
          downPayment: true,
          creditRepaymentAmount: true,
          paymentSchedules: {
            select: {
              payment: true,
              paidAmount: true,
            }
          },
          payments: {
            select: { method: true, amount: true }
          }
        }
      });

      for (const t of transactions) {
        const schedules = t.paymentSchedules || [];
        const payments = t.payments || [];

        let outstanding = 0;
        if (schedules.length > 0) {
          outstanding = schedules.reduce((sum, s) => sum + Math.max(0, (s.payment || 0) - (s.paidAmount || 0)), 0);
        } else {
          const baseAmount = Number((t as any).finalTotal || (t as any).total || 0);
          const downPayment = Number((t as any).downPayment || 0);
          const creditRepaid = Number((t as any).creditRepaymentAmount || 0);
          const uydanAmount = payments.filter(p => String(p.method || '').toUpperCase() === 'UYDAN')
            .reduce((s, p) => s + Number(p.amount || 0), 0);
          outstanding = Math.max(0, baseAmount - downPayment - creditRepaid) + uydanAmount;
        }
        totalOutstandingDebts += outstanding;

        if (t.fromBranchId) {
          outstandingByBranch.set(t.fromBranchId, (outstandingByBranch.get(t.fromBranchId) || 0) + outstanding);
        }
      }
    } catch (e) {
      console.error('Failed to calculate outstanding debts', e);
    }

    const salesCount = await this.prisma.transaction.count({
      where: {
        ...transactionWhere,
        type: TransactionType.SALE,
      },
    });

    // --- SOCIAL SOURCE STATS ---
    const sourceTransactions = await this.prisma.transaction.findMany({
      where: {
        ...transactionWhere,
        type: TransactionType.SALE,
      },
      select: {
        source: true,
        customerId: true,
        finalTotal: true,
      },
    });

    const sourcesList = ['Instagram', 'Telegram', 'Youtube', 'Tanishimdan'];
    const socialStatsMap = new Map<string, { source: string; totalRevenue: number; salesCount: number; uniqueCustomers: Set<number> }>();

    for (const src of [...sourcesList, 'Boshqa']) {
      socialStatsMap.set(src, {
        source: src,
        totalRevenue: 0,
        salesCount: 0,
        uniqueCustomers: new Set<number>(),
      });
    }

    for (const tx of sourceTransactions) {
      const src = tx.source && sourcesList.includes(tx.source) ? tx.source : 'Boshqa';
      const stats = socialStatsMap.get(src)!;
      stats.totalRevenue += Number(tx.finalTotal || 0);
      stats.salesCount++;
      if (tx.customerId) {
        stats.uniqueCustomers.add(tx.customerId);
      }
    }

    const socialMediaStats = Array.from(socialStatsMap.values()).map(s => ({
      source: s.source,
      totalRevenue: s.totalRevenue,
      salesCount: s.salesCount,
      uniqueCustomersCount: s.uniqueCustomers.size,
    }));

    // Fetch all active branches
    const allBranches = await this.prisma.branch.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        type: true,
        cashBalance: true,
      },
    });

    // 1. Group active sales by branch in memory
    const salesByBranch = new Map<number, { volume: number; count: number; creditVolume: number }>();
    activeSales.forEach(t => {
      const bId = t.fromBranchId;
      if (!bId) return;
      if (!salesByBranch.has(bId)) {
        salesByBranch.set(bId, { volume: 0, count: 0, creditVolume: 0 });
      }
      const data = salesByBranch.get(bId)!;
      const finalTotal = t.finalTotal || t.total || 0;
      data.volume += finalTotal;
      data.count += 1;
      if (t.paymentType === 'CREDIT' || t.paymentType === 'INSTALLMENT') {
        data.creditVolume += finalTotal;
      }
    });

    // 2. Fetch and group repayments by branch
    const branchDailyRepayments = await this.prisma.dailyRepayment.groupBy({
      by: ['branchId'],
      where: repaymentWhere,
      _sum: { amount: true },
    });
    const branchCreditRepayments = await this.prisma.creditRepayment.groupBy({
      by: ['branchId'],
      where: repaymentWhere,
      _sum: { amount: true },
    });
    const repaymentsByBranch = new Map<number, number>();
    branchDailyRepayments.forEach(r => {
      if (r.branchId) {
        repaymentsByBranch.set(r.branchId, (repaymentsByBranch.get(r.branchId) || 0) + (r._sum.amount || 0));
      }
    });
    branchCreditRepayments.forEach(r => {
      if (r.branchId) {
        repaymentsByBranch.set(r.branchId, (repaymentsByBranch.get(r.branchId) || 0) + (r._sum.amount || 0));
      }
    });

    // 3. Outstanding debts per branch are already computed in the totalOutstandingDebts block.

    // 4. Group netProfit from bonuses in memory
    const branchBonuses = await this.prisma.bonus.findMany({
      where: {
        createdAt: { gte: start, lte: end }
      },
      select: {
        branchId: true,
        description: true,
      }
    });
    const profitByBranch = new Map<number, number>();
    branchBonuses.forEach(b => {
      if (b.branchId && b.description) {
        const matchProfit = b.description.match(/Sof ortiqcha:\s*([\d,.-]+)/i);
        if (matchProfit) {
          const valStr = matchProfit[1].replace(/,/g, '');
          const val = parseFloat(valStr) || 0;
          profitByBranch.set(b.branchId, (profitByBranch.get(b.branchId) || 0) + val);
        }
      }
    });

    // 5. Construct the final branches report array
    const branchesReport = allBranches.map(b => {
      const sales = salesByBranch.get(b.id) || { volume: 0, count: 0, creditVolume: 0 };
      const repayments = repaymentsByBranch.get(b.id) || 0;
      const outstanding = outstandingByBranch.get(b.id) || 0;
      const profit = profitByBranch.get(b.id) || 0;
      return {
        branchId: b.id,
        name: b.name,
        type: b.type,
        cashBalance: b.cashBalance || 0,
        salesVolume: sales.volume,
        salesCount: sales.count,
        creditSales: sales.creditVolume,
        repaymentsCollected: repayments,
        outstandingDebts: outstanding,
        netProfit: profit,
      };
    });

    return {
      dateRange: { start, end },
      salesCount,
      socialMediaStats,
      branchesReport,
      cashRegister: {
        sales: {
          cash: cashSales,
          card: cardSales,
          terminal: terminalSales,
          credit: creditSales,
          installment: installmentSales,
          uydan: uydanSales,
          thirdParty: thirdPartySales,
          tovar: tovarSales,
          total: totalSales,
        },
        repayments: {
          cash: totalRepaymentsCash,
          card: totalRepaymentsCard,
          total: totalRepaymentsCash + totalRepaymentsCard,
        },
        cashBalance,
        totalOutstandingDebts,
        cashierKassasTotal,
      },
      topEmployees,
      topProducts,
      topCustomers,
      delivery: {
        tasks: {
          pending: pendingDeliveries,
          accepted: acceptedDeliveries,
          completed: completedDeliveriesCount,
          total: totalDeliveries,
        },
        topDrivers,
        orderStatuses,
        dailyStats,
        monthlyStats,
        fastestAuditors,
        mostActiveAuditors,
        branchStats,
        deliveryTimeAnalysis,
      },
      cashierKassas,
    };
  }

  async getAuditorStats(auditorId: number) {
    const auditor = await this.prisma.user.findUnique({
      where: { id: auditorId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        username: true,
        faceTemplates: {
          select: {
            imageUrl: true,
          },
          take: 1,
        }
      }
    });

    if (!auditor) {
      throw new NotFoundException('Auditor not found');
    }

    // Query tasks for this auditor
    const tasks = await this.prisma.task.findMany({
      where: {
        auditorId,
      },
      include: {
        transaction: {
          select: {
            status: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    let total = 0;
    let completed = 0;
    let cancelled = 0;
    let inProgress = 0;
    let totalMinutes = 0;
    let latestActivity: Date | null = null;

    const durations: number[] = [];

    for (const t of tasks) {
      total++;
      if (t.transaction?.status === 'CANCELLED') {
        cancelled++;
      } else if (t.status === 'DELIVERED') {
        completed++;
        const durationMs = t.updatedAt.getTime() - t.createdAt.getTime();
        const durationMin = Math.max(0, durationMs / (1000 * 60));
        durations.push(durationMin);
        totalMinutes += durationMin;
      } else if (t.status === 'ACCEPTED') {
        inProgress++;
      }
      
      const activityDate = t.updatedAt || t.createdAt;
      if (activityDate) {
        if (!latestActivity || activityDate.getTime() > latestActivity.getTime()) {
          latestActivity = activityDate;
        }
      }
    }

    const avgTimeMin = durations.length > 0 ? Math.round(totalMinutes / durations.length) : 0;

    // Daily stats for the last 30 days
    const dailyStats: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyStats.push({
        date: dateStr,
        total: 0,
        completed: 0,
      });
    }

    for (const t of tasks) {
      const dateStr = t.createdAt.toISOString().split('T')[0];
      const entry = dailyStats.find(d => d.date === dateStr);
      if (entry) {
        entry.total++;
        if (t.status === 'DELIVERED') {
          entry.completed++;
        }
      }
    }

    return {
      auditor: {
        id: auditor.id,
        fullName: `${auditor.firstName || ''} ${auditor.lastName || ''}`.trim() || auditor.username,
        phone: auditor.phone || '',
        imageUrl: auditor.faceTemplates?.[0]?.imageUrl || null,
      },
      stats: {
        total,
        completed,
        cancelled,
        inProgress,
        avgTimeMin,
        latestActivity,
      },
      dailyStats,
    };
  }  async getProfitAndExpenses(branchId?: number, startDate?: string, endDate?: string) {
    const bonusWhere: any = {};
    if (branchId) {
      bonusWhere.branchId = branchId;
    }
    if (startDate || endDate) {
      bonusWhere.createdAt = {};
      if (startDate) {
        bonusWhere.createdAt.gte = new Date(`${startDate}T00:00:00`);
      }
      if (endDate) {
        bonusWhere.createdAt.lte = new Date(`${endDate}T23:59:59`);
      }
    }

    const bonuses = await this.prisma.bonus.findMany({
      where: bonusWhere,
      select: {
        description: true,
      },
    });

    let totalProfit = 0;
    for (const b of bonuses) {
      if (b.description) {
        const matchProfit = b.description.match(/Sof ortiqcha:\s*([\d,.-]+)/i);
        if (matchProfit) {
          const valStr = matchProfit[1].replace(/,/g, '');
          totalProfit += parseFloat(valStr) || 0;
        }
      }
    }

    // Fetch daily expenses
    const expenses = await this.prisma.dailyExpense.findMany();
    const startBound = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const endBound = endDate ? new Date(`${endDate}T23:59:59`) : null;

    const expensesTotal = expenses
      .filter((ex) => {
        if (branchId) {
          return false;
        }
        const createdAt = ex.createdAt ? new Date(ex.createdAt) : null;
        if (!createdAt) return true;
        if (startBound && createdAt < startBound) return false;
        if (endBound && createdAt > endBound) return false;
        return true;
      })
      .reduce((sum, ex) => sum + (ex.amount || 0), 0);

    const netProfit = totalProfit - expensesTotal;

    return {
      totalProfit,
      expensesTotal,
      netProfit,
    };
  }
  async getHandoverTotal(branchId?: number, startDate?: string, endDate?: string) {
    let start = new Date();
    let end = new Date();

    if (startDate) {
      start = new Date(startDate);
      if (startDate.length <= 10) {
        start.setHours(0, 0, 0, 0);
      }
    } else {
      start = new Date('2000-01-01T00:00:00.000Z');
    }
    if (endDate) {
      end = new Date(endDate);
      if (endDate.length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
    } else {
      end = new Date();
    }

    const transactionWhere: any = {
      type: TransactionType.SALE,
      status: { not: TransactionStatus.CANCELLED },
      createdAt: { gte: start, lte: end },
    };
    if (branchId) {
      transactionWhere.OR = [
        { fromBranchId: branchId },
        { toBranchId: branchId },
      ];
    }

    const transactions = await this.prisma.transaction.findMany({
      where: transactionWhere,
      include: {
        payments: true,
      }
    });

    const repaymentWhere: any = {
      paidAt: { gte: start, lte: end },
    };
    if (branchId) {
      repaymentWhere.branchId = branchId;
    }

    const creditRepayments = await this.prisma.creditRepayment.findMany({
      where: repaymentWhere,
    });

    const dailyRepayments = await this.prisma.dailyRepayment.findMany({
      where: repaymentWhere,
    });

    const defectiveWhere: any = {
      createdAt: { gte: start, lte: end },
    };
    if (branchId) {
      defectiveWhere.branchId = branchId;
    }

    const defectiveLogs = await this.prisma.defectiveLog.findMany({
      where: defectiveWhere,
      include: {
        product: true
      }
    });

    const linkedTxIds = defectiveLogs
      .map(log => log.transactionId)
      .filter((id): id is number => id !== null);

    const linkedTransactions = linkedTxIds.length > 0
      ? await this.prisma.transaction.findMany({
          where: { id: { in: linkedTxIds } },
          include: { items: true }
        })
      : [];

    const cashierMap = new Map<number, {
      cashTotal: number;
      upfrontTotal: number;
      repaymentsCash: number;
      defectivePlus: number;
      defectiveMinus: number;
    }>();

    const getAgg = (id: number) => {
      if (!cashierMap.has(id)) {
        cashierMap.set(id, {
          cashTotal: 0,
          upfrontTotal: 0,
          repaymentsCash: 0,
          defectivePlus: 0,
          defectiveMinus: 0,
        });
      }
      return cashierMap.get(id)!;
    };

    transactions.forEach(t => {
      const final = t.finalTotal || t.total || 0;
      const amountPaid = t.amountPaid || 0;
      const downPayment = t.downPayment || 0;
      const upfront = ['CREDIT', 'INSTALLMENT'].includes(t.paymentType || '') ? amountPaid : 0;
      const hasSplitPayments = Array.isArray(t.payments) && t.payments.length > 0;

      const userIds = new Set<number>();
      if (t.soldByUserId) userIds.add(t.soldByUserId);
      if (t.userId) userIds.add(t.userId);

      userIds.forEach(uid => {
        const agg = getAgg(uid);

        if (hasSplitPayments) {
          t.payments.forEach(p => {
            const amt = p.amount || 0;
            const m = String(p.method || '').toUpperCase();

            if (['CREDIT', 'INSTALLMENT'].includes(t.paymentType || '')) {
              agg.upfrontTotal += amt;
            } else {
              if (m === 'CASH') agg.cashTotal += amt;
            }
          });
        } else {
          switch (t.paymentType) {
            case 'CASH':
              agg.cashTotal += final;
              break;
            case 'CREDIT':
            case 'INSTALLMENT':
              agg.upfrontTotal += upfront;
              break;
          }
        }
      });
    });

    const allRepayments = [
      ...creditRepayments.map(r => ({ ...r, _type: 'CREDIT' })),
      ...dailyRepayments.map(r => ({ ...r, _type: 'DAILY' }))
    ];

    const seenRepayments = new Set<string>();

    allRepayments.forEach(l => {
      const amt = Number(l.amount || 0);
      if (!amt || !l.paidByUserId) return;

      const rKey = `${l.transactionId}:${amt}:${new Date(l.paidAt).toISOString()}`;
      if (seenRepayments.has(rKey)) return;
      seenRepayments.add(rKey);

      const ch = (l.channel || 'CASH').toUpperCase();
      if (ch === 'CASH') {
        const agg = getAgg(l.paidByUserId);
        agg.repaymentsCash += amt;
      }
    });

    for (const log of defectiveLogs) {
      const cashierId = log.handledByUserId || log.userId;
      if (!cashierId) continue;

      const raw = Number(log.cashAmount ?? 0) || 0;
      const dir = String(log.cashAdjustmentDirection || '').toUpperCase();
      let signed = dir === 'MINUS' ? -Math.abs(raw) : dir === 'PLUS' ? Math.abs(raw) : raw;
      const isReturn = String(log.actionType || '').toUpperCase() === 'RETURN';

      if (signed === 0 && isReturn) {
        const txId = log.transactionId;
        if (txId) {
          const tx = linkedTransactions.find(t => t.id === txId);
          if (tx && Array.isArray(tx.items)) {
            const it = tx.items.find(ii => Number(ii.productId) === Number(log.productId));
            const unit = Number((it?.sellingPrice ?? it?.price ?? log.product?.price) || 0);
            const qty = Number(log.quantity || 0);
            if (unit > 0 && qty > 0) signed = -Math.abs(unit * qty);
          }
        }
      }

      if (signed === 0) continue;

      const agg = getAgg(cashierId);
      if (signed > 0) {
        agg.defectivePlus += signed;
      } else {
        agg.defectiveMinus += Math.abs(signed);
      }
    }

    const activeCashiers = await this.prisma.user.findMany({
      where: {
        role: UserRole.CASHIER,
        status: UserStatus.ACTIVE,
        ...(branchId ? { branchId } : {})
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true
      }
    });

    let overallHandoverTotal = 0;
    const details = activeCashiers.map(cashier => {
      const agg = cashierMap.get(cashier.id) || {
        cashTotal: 0,
        upfrontTotal: 0,
        repaymentsCash: 0,
        defectivePlus: 0,
        defectiveMinus: 0,
      };

      const handover = agg.cashTotal + agg.repaymentsCash + agg.upfrontTotal + (agg.defectivePlus - agg.defectiveMinus);
      overallHandoverTotal += handover;

      return {
        cashierId: cashier.id,
        fullName: `${cashier.firstName || ''} ${cashier.lastName || ''}`.trim() || cashier.username,
        username: cashier.username,
        cashTotal: agg.cashTotal,
        repaymentsCash: agg.repaymentsCash,
        upfrontTotal: agg.upfrontTotal,
        defectivePlus: agg.defectivePlus,
        defectiveMinus: agg.defectiveMinus,
        handoverAmount: handover,
      };
    });

    return {
      overallHandoverTotal,
      details
    };
  }

  async getWarehouseStats(branchId?: number, startDate?: string, endDate?: string) {
    let start = new Date();
    let end = new Date();

    if (startDate) {
      start = new Date(startDate);
      if (startDate.length <= 10) {
        start.setHours(0, 0, 0, 0);
      }
    } else {
      start = new Date('2000-01-01T00:00:00.000Z');
    }
    if (endDate) {
      end = new Date(endDate);
      if (endDate.length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
    } else {
      end = new Date();
    }

    const whereClause: any = {
      status: { not: TransactionStatus.CANCELLED },
      createdAt: { gte: start, lte: end },
    };

    if (branchId) {
      whereClause.OR = [
        { fromBranchId: branchId },
        { toBranchId: branchId },
      ];
    }

    const transactions = await this.prisma.transaction.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    const branches = await this.prisma.branch.findMany({
      select: {
        id: true,
        name: true,
      }
    });

    let inflowCount = 0;
    let outflowCount = 0;
    let productsEntered = 0;
    let productsReleased = 0;

    const transferMap = new Map<number, { product: any; totalQty: number }>();
    const branchTransferMap = new Map<number, { branch: any; txCount: number; totalQty: number }>();

    for (const tx of transactions) {
      const isTransfer = tx.type === TransactionType.TRANSFER;
      const isPurchase = tx.type === TransactionType.PURCHASE;
      const isSale = tx.type === TransactionType.SALE;
      const isWriteOff = tx.type === TransactionType.WRITE_OFF;
      const isReturn = tx.type === TransactionType.RETURN;

      const itemsCount = tx.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

      if (branchId) {
        if (isPurchase) {
          inflowCount++;
          productsEntered += itemsCount;
        } else if (isSale || isWriteOff) {
          outflowCount++;
          productsReleased += itemsCount;
        } else if (isReturn) {
          inflowCount++;
          productsEntered += itemsCount;
        } else if (isTransfer) {
          if (tx.toBranchId === branchId) {
            inflowCount++;
            productsEntered += itemsCount;
          }
          if (tx.fromBranchId === branchId) {
            outflowCount++;
            productsReleased += itemsCount;
          }
        }
      } else {
        if (isPurchase || isReturn) {
          inflowCount++;
          productsEntered += itemsCount;
        } else if (isSale || isWriteOff) {
          outflowCount++;
          productsReleased += itemsCount;
        } else if (isTransfer) {
          inflowCount++;
          outflowCount++;
          productsEntered += itemsCount;
          productsReleased += itemsCount;
        }
      }

      if (isTransfer) {
        if (tx.toBranchId) {
          const bId = tx.toBranchId;
          const current = branchTransferMap.get(bId) || {
            branch: branches.find(b => b.id === bId) || { id: bId, name: `Filial #${bId}` },
            txCount: 0,
            totalQty: 0
          };
          current.txCount++;
          current.totalQty += itemsCount;
          branchTransferMap.set(bId, current);
        }

        for (const item of tx.items) {
          if (!item.productId || !item.product) continue;
          const pid = item.productId;
          const current = transferMap.get(pid) || { product: item.product, totalQty: 0 };
          current.totalQty += item.quantity || 0;
          transferMap.set(pid, current);
        }
      }
    }

    const topTransferredProducts = Array.from(transferMap.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5)
      .map(item => ({
        productId: item.product.id,
        name: item.product.name,
        model: item.product.model,
        barcode: item.product.barcode,
        quantityTransferred: item.totalQty,
      }));

    const topTransferBranches = Array.from(branchTransferMap.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .map(item => ({
        branchId: item.branch.id,
        branchName: item.branch.name,
        transferCount: item.txCount,
        quantityReceived: item.totalQty,
      }));

    return {
      inflowCount,
      outflowCount,
      productsEntered,
      productsReleased,
      topTransferredProducts,
      topTransferBranches,
    };
  }

  async getCustomerTransactions(
    customerId: number,
    branchId?: number,
    startDate?: string,
    endDate?: string,
  ) {
    let start = new Date();
    let end = new Date();

    if (startDate) {
      start = new Date(startDate);
      const isUTC = startDate.endsWith('Z') || startDate.includes('+');
      if (!isUTC) {
        start.setUTCHours(start.getUTCHours() - 5);
      }
    } else {
      start = new Date('2000-01-01T00:00:00.000Z');
    }
    if (endDate) {
      end = new Date(endDate);
      const isUTC = endDate.endsWith('Z') || endDate.includes('+');
      if (!isUTC) {
        end.setUTCDate(end.getUTCDate() + 1);
        end.setUTCHours(end.getUTCHours() - 5);
        end.setTime(end.getTime() - 1);
      }
    } else {
      end = new Date();
    }

    const transactionWhere: any = {
      customerId,
      status: { not: TransactionStatus.CANCELLED },
      type: TransactionType.SALE,
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    if (branchId) {
      transactionWhere.OR = [
        { fromBranchId: branchId },
        { toBranchId: branchId },
      ];
    }

    const transactions = await this.prisma.transaction.findMany({
      where: transactionWhere,
      include: {
        bonuses: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalSotish = 0;
    let totalSofOrtiqcha = 0;

    const formattedTransactions = transactions.map(tx => {
      let txSotish = 0;
      let txSofOrtiqcha = 0;
      const parsedDetails: string[] = [];

      for (const b of tx.bonuses) {
        if (b.description) {
          parsedDetails.push(b.description);
          let qty = 1;
          const matchQty = b.description.match(/Miqdor:\s*(\d+)/i);
          if (matchQty) {
            qty = parseInt(matchQty[1], 10) || 1;
          }

          const matchSales = b.description.match(/Sotish narxi:\s*([\d,.-]+)/i);
          if (matchSales) {
            const valStr = matchSales[1].replace(/,/g, '');
            txSotish += (parseFloat(valStr) || 0) * qty;
          }
          const matchProfit = b.description.match(/Sof ortiqcha:\s*([\d,.-]+)/i);
          if (matchProfit) {
            const valStr = matchProfit[1].replace(/,/g, '');
            txSofOrtiqcha += parseFloat(valStr) || 0;
          }
        }
      }

      totalSotish += txSotish;
      totalSofOrtiqcha += txSofOrtiqcha;

      return {
        id: tx.id,
        createdAt: tx.createdAt,
        finalTotal: tx.finalTotal,
        paymentType: tx.paymentType,
        sotishNarxi: txSotish,
        sofOrtiqcha: txSofOrtiqcha,
        details: parsedDetails,
        items: tx.items.map(item => ({
          productId: item.productId,
          productName: item.product?.name || 'Unknown',
          productModel: item.product?.model || '',
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
      };
    });

    return {
      transactions: formattedTransactions,
      totalSotish,
      totalSofOrtiqcha,
    };
  }

  async getWarehouseDetailedStats(branchId?: number, startDate?: string, endDate?: string) {
    const fs = require('fs');
    const logPath = '/Users/ismadbek/Desktop/Projects2026/AminovProject-main/debug_stats.log';
    fs.appendFileSync(logPath, `\n=== CALL: branchId=${branchId}, startDate=${startDate}, endDate=${endDate} ===\n`);

    let start = new Date();
    let end = new Date();
    
    if (startDate && !isNaN(Date.parse(startDate))) {
      start = new Date(startDate);
      const isUTC = startDate.endsWith('Z') || startDate.includes('+');
      if (!isUTC) {
        start.setUTCHours(start.getUTCHours() - 5);
      }
    } else {
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    }
    
    if (endDate && !isNaN(Date.parse(endDate))) {
      end = new Date(endDate);
      const isUTC = endDate.endsWith('Z') || endDate.includes('+');
      if (!isUTC) {
        end.setUTCDate(end.getUTCDate() + 1);
        end.setUTCHours(end.getUTCHours() - 5);
        end.setTime(end.getTime() - 1);
      }
    } else {
      end = new Date();
    }

    fs.appendFileSync(logPath, `Computed Range: start=${start.toISOString()} (local: ${start.toString()}), end=${end.toISOString()} (local: ${end.toString()})\n`);

    const skladBranches = await this.prisma.branch.findMany({
      where: { type: 'SKLAD' },
      select: { id: true },
    });
    const skladBranchIds = skladBranches.map(b => b.id);

    const stockBranchId = branchId || 4;

    const productWhere: any = { 
      isDeleted: false,
      branchId: stockBranchId,
    };

    const products = await this.prisma.product.findMany({
      where: productWhere,
      include: {
        category: true,
      },
    });

    const totalStockValue = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        status: { not: TransactionStatus.CANCELLED },
        createdAt: { gte: start, lte: end },
        OR: [
          { fromBranchId: stockBranchId },
          { toBranchId: stockBranchId },
          {
            items: {
              some: {
                product: {
                  branchId: stockBranchId,
                },
              },
            },
          },
        ],
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        toBranch: true,
        fromBranch: true,
      },
    });

    const defectiveLogs = await this.prisma.defectiveLog.findMany({
      where: {
        branchId: stockBranchId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        product: true,
      },
    });

    let incomingQty = 0;
    let outgoingQty = 0;
    let returnedQty = 0;
    let defectiveQty = 0;
    let transferToStoreQty = 0;
    let purchaseFromSupplierQty = 0;

    const incomingList: any[] = [];
    const outgoingList: any[] = [];
    const returnedList: any[] = [];
    const defectiveList: any[] = [];

    transactions.forEach(tx => {
      const isFromMe = tx.fromBranchId === stockBranchId;
      const isToMe = tx.toBranchId === stockBranchId || (tx.type === TransactionType.PURCHASE && tx.items.some(item => item.product?.branchId === stockBranchId));
      const totalItems = tx.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

      if (tx.type === TransactionType.PURCHASE) {
        if (isToMe) {
          incomingQty += totalItems;
          purchaseFromSupplierQty += totalItems;
        }
      } else if (tx.type === TransactionType.SALE || tx.type === TransactionType.WRITE_OFF) {
        if (isFromMe) {
          outgoingQty += totalItems;
        }
      } else if (tx.type === TransactionType.RETURN) {
        if (isToMe) {
          incomingQty += totalItems;
          returnedQty += totalItems;
        }
      } else if (tx.type === TransactionType.TRANSFER) {
        if (isFromMe) {
          outgoingQty += totalItems;
          if (tx.toBranch?.type === 'SAVDO_MARKAZ') {
            transferToStoreQty += totalItems;
          }
        }
        if (isToMe) {
          incomingQty += totalItems;
        }
      }

      tx.items.forEach(item => {
        const qty = item.quantity || 0;
        if (qty <= 0) return;

        const prod = item.product;
        const productInfo = {
          id: `${tx.id}-${item.id}`,
          productId: prod?.id || null,
          productName: prod?.name || 'Номаълум маҳсулот',
          model: prod?.model || '',
          barcode: prod?.barcode || '',
          quantity: qty,
          price: item.price || 0,
          totalPrice: item.total || (qty * (item.price || 0)),
          reason: tx.description === 'Initial stock for product creation'
            ? 'Маҳсулот яратилгандаги бошланғич қолдиқ'
            : (tx.description || ''),
          date: tx.createdAt.toISOString(),
        };

        if (tx.type === TransactionType.PURCHASE) {
          if (isToMe) {
            incomingList.push({
              ...productInfo,
              type: 'Харид',
            });
          }
        } else if (tx.type === TransactionType.SALE) {
          if (isFromMe) {
            outgoingList.push({
              ...productInfo,
              type: 'Сотиш',
            });
          }
        } else if (tx.type === TransactionType.WRITE_OFF) {
          if (isFromMe) {
            outgoingList.push({
              ...productInfo,
              type: 'Ҳисобдан чиқариш (Брак)',
            });
          }
        } else if (tx.type === TransactionType.RETURN) {
          if (isToMe) {
            incomingList.push({
              ...productInfo,
              type: 'Қайтиш',
            });
            returnedList.push({
              ...productInfo,
              type: 'Қайтиш',
            });
          }
        } else if (tx.type === TransactionType.TRANSFER) {
          if (isFromMe) {
            outgoingList.push({
              ...productInfo,
              type: `Ўтказиш (${tx.toBranch?.name || 'Бошқа бўлим'})`,
            });
          }
          if (isToMe) {
            incomingList.push({
              ...productInfo,
              type: `Ўтказиш (${tx.fromBranch?.name || 'Бошқа бўлим'})`,
            });
          }
        }
      });
    });

    defectiveLogs.forEach(log => {
      const action = String(log.actionType || '').toUpperCase();
      if (action === 'DEFECTIVE') {
        defectiveQty += log.quantity;
      } else if (action === 'RETURN') {
        returnedQty += log.quantity;
        incomingQty += log.quantity;
      }

      const qty = log.quantity || 0;
      if (qty <= 0) return;

      const prod = log.product;
      const productInfo = {
        id: `log-${log.id}`,
        productId: prod?.id || null,
        productName: prod?.name || 'Номаълум маҳсулот',
        model: prod?.model || '',
        barcode: prod?.barcode || '',
        quantity: qty,
        price: prod?.price || 0,
        totalPrice: qty * (prod?.price || 0),
        reason: log.description || '',
        date: log.createdAt.toISOString(),
      };

      if (action === 'DEFECTIVE') {
        defectiveList.push({
          ...productInfo,
          type: 'Брак маҳсулот',
        });
      } else if (action === 'RETURN') {
        incomingList.push({
          ...productInfo,
          type: 'Қайтарилган маҳсулот',
        });
        returnedList.push({
          ...productInfo,
          type: 'Қайтарилган маҳсулот',
        });
      }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesInLast30DaysWhere: any = {
      transaction: {
        status: { not: TransactionStatus.CANCELLED },
        type: TransactionType.SALE,
        createdAt: { gte: thirtyDaysAgo },
      },
    };
    if (branchId) {
      salesInLast30DaysWhere.transaction.fromBranchId = branchId;
    } else {
      salesInLast30DaysWhere.transaction.fromBranch = { type: 'SKLAD' };
    }

    const salesInLast30Days = await this.prisma.transactionItem.findMany({
      where: salesInLast30DaysWhere,
    });

    const productSalesMap = new Map<number, number>();
    salesInLast30Days.forEach(item => {
      if (item.productId) {
        productSalesMap.set(item.productId, (productSalesMap.get(item.productId) || 0) + item.quantity);
      }
    });

    const totalSalesQtyLast30Days = Array.from(productSalesMap.values()).reduce((sum, q) => sum + q, 0);
    const avgDailySalesQty = totalSalesQtyLast30Days / 30;

    const totalStockQty = products.reduce((sum, p) => sum + p.quantity, 0);
    const daysOfStock = avgDailySalesQty > 0 ? Math.round(totalStockQty / avgDailySalesQty) : 999;

    const rangeSalesWhere: any = {
      transaction: {
        status: { not: TransactionStatus.CANCELLED },
        type: TransactionType.SALE,
        createdAt: { gte: start, lte: end },
      },
    };
    if (branchId) {
      rangeSalesWhere.transaction.fromBranchId = branchId;
    } else {
      rangeSalesWhere.transaction.fromBranch = { type: 'SKLAD' };
    }

    const rangeSales = await this.prisma.transactionItem.findMany({
      where: rangeSalesWhere,
      include: {
        product: true,
      },
    });

    const rangeSalesMap = new Map<number, { product: any; totalQty: number; totalSum: number }>();
    rangeSales.forEach(item => {
      if (item.productId && item.product) {
        const current = rangeSalesMap.get(item.productId) || { product: item.product, totalQty: 0, totalSum: 0 };
        current.totalQty += item.quantity;
        current.totalSum += item.total;
        rangeSalesMap.set(item.productId, current);
      }
    });

    const sortedRangeSales = Array.from(rangeSalesMap.values())
      .sort((a, b) => b.totalQty - a.totalQty);

    const top20Products = sortedRangeSales.slice(0, 20).map(x => ({
      id: x.product.id,
      name: x.product.name,
      model: x.product.model,
      barcode: x.product.barcode,
      price: x.product.price,
      quantitySold: x.totalQty,
      totalRevenue: x.totalSum,
    }));

    const slowestProducts = products
      .map(p => ({
        id: p.id,
        name: p.name,
        model: p.model,
        barcode: p.barcode,
        price: p.price,
        quantity: p.quantity,
        quantitySold30Days: productSalesMap.get(p.id) || 0,
      }))
      .sort((a, b) => a.quantitySold30Days - b.quantitySold30Days)
      .slice(0, 20);

    const runningOutProducts = products
      .filter(p => p.quantity > 0 && p.quantity <= 5)
      .map(p => {
        const sales30Days = productSalesMap.get(p.id) || 0;
        const dailyAvg = sales30Days / 30;
        const daysRemaining = dailyAvg > 0 ? Math.round(p.quantity / dailyAvg) : 999;
        const estimateDate = new Date();
        if (daysRemaining < 999) {
          estimateDate.setDate(estimateDate.getDate() + daysRemaining);
        }
        return {
          id: p.id,
          name: p.name,
          model: p.model,
          barcode: p.barcode,
          price: p.price,
          quantity: p.quantity,
          daysRemaining,
          estimateDate: daysRemaining < 999 ? estimateDate.toISOString().split('T')[0] : 'Tugamaydi',
        };
      })
      .sort((a, b) => a.quantity - b.quantity);

    const overstockedProducts = products
      .map(p => {
        const sales30Days = productSalesMap.get(p.id) || 0;
        return {
          id: p.id,
          name: p.name,
          model: p.model,
          barcode: p.barcode,
          price: p.price,
          quantity: p.quantity,
          sales30Days,
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20);

    const branchTasks = await this.prisma.task.findMany({
      where: {
        status: TaskStatus.DELIVERED,
        transaction: {
          fromBranchId: branchId,
          createdAt: { gte: start, lte: end },
        },
      },
    });

    let totalPickingMinutes = 0;
    branchTasks.forEach(task => {
      const diffMs = task.updatedAt.getTime() - task.createdAt.getTime();
      totalPickingMinutes += Math.max(0, diffMs / (1000 * 60));
    });
    const avgPickingSpeedMin = branchTasks.length > 0 ? Math.round(totalPickingMinutes / branchTasks.length) : 0;

    const adjustments = await this.prisma.transaction.findMany({
      where: {
        status: { not: TransactionStatus.CANCELLED },
        type: TransactionType.STOCK_ADJUSTMENT,
        fromBranchId: branchId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    let inventoryAccuracy = 100.0;
    let adjustmentDifference = 0;
    let largestDeficits: any[] = [];
    let largestSurpluses: any[] = [];

    const adjustItems: any[] = [];
    adjustments.forEach(adj => {
      adj.items.forEach(item => {
        if (item.product) {
          adjustItems.push({
            id: item.product.id,
            name: item.product.name,
            model: item.product.model,
            barcode: item.product.barcode,
            quantity: item.quantity,
            totalVal: item.total,
          });
          adjustmentDifference += item.quantity;
        }
      });
    });

    if (products.length > 0 && adjustItems.length > 0) {
      const totalProductCount = products.reduce((sum, p) => sum + p.quantity, 0);
      const adjustedCount = adjustItems.reduce((sum, item) => sum + Math.abs(item.quantity), 0);
      inventoryAccuracy = Math.max(0, Number((100 - (adjustedCount / (totalProductCount || 1)) * 100).toFixed(2)));
    }

    largestDeficits = adjustItems.filter(x => x.quantity < 0).sort((a, b) => a.quantity - b.quantity).slice(0, 10);
    largestSurpluses = adjustItems.filter(x => x.quantity > 0).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

    const errorCount = defectiveLogs.length + transactions.filter(t => t.type === TransactionType.RETURN).length;
    const writeOffs = transactions.filter(t => t.type === TransactionType.WRITE_OFF);
    const lostItemsCount = writeOffs.reduce((sum, tx) => sum + tx.items.reduce((s, i) => s + i.quantity, 0), 0);

    const totalRevenueRange = sortedRangeSales.reduce((sum, x) => sum + x.totalSum, 0);
    let runningRevenue = 0;
    const abcAnalysis = sortedRangeSales.map(x => {
      runningRevenue += x.totalSum;
      const pct = totalRevenueRange > 0 ? (runningRevenue / totalRevenueRange) * 100 : 0;
      let classification = 'C';
      if (pct <= 80) classification = 'A';
      else if (pct <= 95) classification = 'B';
      return {
        id: x.product.id,
        name: x.product.name,
        model: x.product.model,
        barcode: x.product.barcode,
        revenue: x.totalSum,
        percentage: totalRevenueRange > 0 ? (x.totalSum / totalRevenueRange) * 100 : 0,
        class: classification,
      };
    });

    const xyzAnalysis: any[] = [];
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const weeks: { start: Date; end: Date }[] = [];
    for (let i = 0; i < 4; i++) {
      const wStart = new Date(end.getTime() - (i + 1) * oneWeekMs);
      const wEnd = new Date(end.getTime() - i * oneWeekMs);
      weeks.push({ start: wStart, end: wEnd });
    }

    const weeklySales = await Promise.all(
      weeks.map(w =>
        this.prisma.transactionItem.findMany({
          where: {
            transaction: {
              status: { not: TransactionStatus.CANCELLED },
              type: TransactionType.SALE,
              fromBranchId: branchId,
              createdAt: { gte: w.start, lte: w.end },
            },
          },
          select: {
            productId: true,
            quantity: true,
          },
        }),
      ),
    );

    products.forEach(p => {
      const qtys = weeklySales.map(wList =>
        wList.filter(item => item.productId === p.id).reduce((sum, item) => sum + item.quantity, 0),
      );
      const mean = qtys.reduce((sum, q) => sum + q, 0) / 4;
      if (mean === 0) {
        xyzAnalysis.push({
          id: p.id,
          name: p.name,
          model: p.model,
          barcode: p.barcode,
          coefficientOfVariation: 999,
          class: 'Z',
        });
        return;
      }
      const variance = qtys.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / 4;
      const stdDev = Math.sqrt(variance);
      const cv = stdDev / mean;
      let classification = 'Z';
      if (cv <= 0.15) classification = 'X';
      else if (cv <= 0.35) classification = 'Y';

      xyzAnalysis.push({
        id: p.id,
        name: p.name,
        model: p.model,
        barcode: p.barcode,
        coefficientOfVariation: Number((cv * 100).toFixed(2)),
        class: classification,
      });
    });

    return {
      movement: {
        incomingQty,
        outgoingQty,
        returnedQty,
        defectiveQty,
        transferToStoreQty,
        purchaseFromSupplierQty,
        incomingList,
        outgoingList,
        returnedList,
        defectiveList,
      },
      stock: {
        totalStockValue,
        totalStockQty,
        daysOfStock,
        top20Products,
        slowestProducts,
        runningOutProducts,
        overstockedProducts,
      },
      operator: {
        inventoryAccuracy,
        avgPickingSpeedMin,
        errorCount,
        lostItemsCount,
        adjustmentDifference,
        largestDeficits,
        largestSurpluses,
        abcAnalysis: abcAnalysis.slice(0, 30),
        xyzAnalysis: xyzAnalysis.slice(0, 30),
      },
    };
  }
}

