import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDefectiveLogDto } from './dto/create-defective-log.dto';
import { UpdateDefectiveLogDto } from './dto/update-defective-log.dto';
import { ProductStatus } from '@prisma/client';

@Injectable()
export class DefectiveLogService {
  constructor(private prisma: PrismaService) {}

  // Helper method to recalculate payment schedules for a transaction
  private async recalculatePaymentSchedules(transactionId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { 
        items: true,
        paymentSchedules: true
      }
    });

    if (!transaction || (transaction.paymentType !== 'CREDIT' && transaction.paymentType !== 'INSTALLMENT')) {
      return; // Only recalculate for credit/installment transactions
    }

    // Delete existing payment schedules
    if (transaction.paymentSchedules.length > 0) {
      await this.prisma.paymentSchedule.deleteMany({
        where: { transactionId }
      });
    }

    // Recalculate based on remaining items
    const remainingItems = transaction.items.filter(item => item.quantity > 0);
    if (remainingItems.length === 0) {
      return; // No items left, no need for schedules
    }

    // Aggregate principal and determine weighted interest and months
    let totalPrincipal = 0;
    let weightedPercentSum = 0;
    let percentWeightBase = 0;
    let totalMonths = 0;

    for (const item of remainingItems) {
      const principal = (item.price || 0) * (item.quantity || 0);
      totalPrincipal += principal;
      if (item.creditPercent) {
        weightedPercentSum += principal * (item.creditPercent || 0);
        percentWeightBase += principal;
      }
      if (item.creditMonth) {
        totalMonths = Math.max(totalMonths, item.creditMonth || 0);
      }
    }

    if (totalPrincipal > 0 && totalMonths > 0) {
      // Calculate remaining principal after upfront payment
      const upfrontPayment = transaction.amountPaid || 0;
      const remainingPrincipal = Math.max(0, totalPrincipal - upfrontPayment);
      const effectivePercent = percentWeightBase > 0 ? (weightedPercentSum / percentWeightBase) : 0;
      
      const interestAmount = remainingPrincipal * effectivePercent;
      const remainingWithInterest = remainingPrincipal + interestAmount;
      const monthlyPayment = remainingWithInterest / totalMonths;
      let remainingBalance = remainingWithInterest;

      const schedules: { transactionId: number; month: number; payment: number; remainingBalance: number; isPaid: boolean; paidAmount: number; }[] = [];
      for (let month = 1; month <= totalMonths; month++) {
        // For the last month, use the exact remaining balance to avoid floating point errors
        const currentPayment = month === totalMonths ? remainingBalance : monthlyPayment;
        remainingBalance -= currentPayment;
        schedules.push({
          transactionId,
          month,
          payment: currentPayment,
          remainingBalance: Math.max(0, remainingBalance),
          isPaid: false,
          paidAmount: 0
        });
      }

      if (schedules.length > 0) {
        await this.prisma.paymentSchedule.createMany({
          data: schedules
        });
      }

      // Update transaction totals
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: { 
          total: totalPrincipal,
          finalTotal: remainingWithInterest
        }
      });
    }
  }

  async create(createDefectiveLogDto: CreateDefectiveLogDto) {
    const { productId, quantity, description, userId, branchId, actionType = 'DEFECTIVE', isFromSale, transactionId, customerId, cashAdjustmentDirection, cashAmount: cashAmountInput, exchangeWithProductId, replacementQuantity, replacementUnitPrice } = createDefectiveLogDto;

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi');
    }

    // Check if branch exists
    if (branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId }
      });
      if (!branch) {
        throw new NotFoundException('Filial topilmadi');
      }
    }

    // Validate quantity based on action type
    if (actionType === 'DEFECTIVE') {
      // If this is from a sale, do not validate against current store quantity
      if (!isFromSale) {
        if (quantity > product.quantity) {
          throw new BadRequestException(`Defective miqdori mavjud miqdordan ko'p bo'lishi mumkin emas. Mavjud: ${product.quantity}, so'ralgan: ${quantity}`);
        }
      }
    }

    // Calculate cash amount based on action type
    let cashAmount = 0;
    let newQuantity = product.quantity;
    let newDefectiveQuantity = product.defectiveQuantity;
    let newReturnedQuantity = product.returnedQuantity;
    let newExchangedQuantity = product.exchangedQuantity;
    let newStatus = product.status;

    switch (actionType) {
      case 'DEFECTIVE':
        // Kassadan pul chiqadi (mahsulot narhi)
        cashAmount = -(product.price * quantity);
        // If from sale, do not reduce store quantity, only track defective count
        if (isFromSale) {
          newQuantity = product.quantity; // unchanged in store
        } else {
          newQuantity = Math.max(0, product.quantity - quantity);
        }
        newDefectiveQuantity = product.defectiveQuantity + quantity;
        newStatus = newQuantity === 0 ? ProductStatus.DEFECTIVE : ProductStatus.IN_STORE;
        break;

      case 'FIXED':
        // Kassaga pul qaytadi (mahsulot narhi)
        cashAmount = product.price * quantity;
        newDefectiveQuantity = Math.max(0, product.defectiveQuantity - quantity);
        newQuantity = product.quantity + quantity;
        newStatus = ProductStatus.IN_STORE;
        break;

      case 'RETURN':
        // Respect explicit cashier override for cash direction/amount when provided
        if (typeof cashAmountInput === 'number' && cashAdjustmentDirection) {
          cashAmount = (cashAdjustmentDirection === 'PLUS' ? 1 : -1) * Math.abs(Number(cashAmountInput) || 0);
        } else {
          // Default behavior: money leaves cashbox (negative)
          cashAmount = -(product.price * quantity);
        }
        newReturnedQuantity = product.returnedQuantity + quantity;
        newStatus = ProductStatus.RETURNED;
        // Returned items increase store stock back
        newQuantity = product.quantity + quantity;
        break;

      case 'EXCHANGE':
        // Respect explicit cashier override when provided
        if (typeof cashAmountInput === 'number' && cashAdjustmentDirection) {
          cashAmount = (cashAdjustmentDirection === 'PLUS' ? 1 : -1) * Math.abs(Number(cashAmountInput) || 0);
        } else {
          // Default behavior: money enters cashbox (positive) for replacement price delta can be handled client-side
          cashAmount = product.price * quantity;
        }
        newExchangedQuantity = product.exchangedQuantity + quantity;
        newStatus = ProductStatus.EXCHANGED;
        // Exchanged returns increase original stock
        newQuantity = product.quantity + quantity;
        break;

      default:
        throw new BadRequestException('Noto\'g\'ri action type');
    }

    // Use transaction to ensure data consistency
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create defective log
      const defectiveLog = await prisma.defectiveLog.create({
        data: {
          productId,
          quantity,
          description,
          userId,
          branchId,
          cashAmount,
          actionType
        },
        include: {
          product: true,
          user: true,
          branch: true
        }
      });

      // Update product quantities and status
      await prisma.product.update({
        where: { id: productId },
        data: {
          quantity: newQuantity,
          defectiveQuantity: newDefectiveQuantity,
          returnedQuantity: newReturnedQuantity,
          exchangedQuantity: newExchangedQuantity,
          status: newStatus
        }
      });

      // When linked to a sale, mutate the Transaction items accordingly
      if (isFromSale && transactionId) {
        const tx = await prisma.transaction.findUnique({
          where: { id: Number(transactionId) },
          include: { items: true }
        });
        if (tx) {
          // Find the original item for productId
          const orig = tx.items.find(i => i.productId === productId);
          if (orig) {
            // Guard against over-deduction: cannot return/exchange more than sold in this line
            if (Number(quantity) > Number(orig.quantity)) {
              throw new BadRequestException(`Tanlangan sotuvda mavjud miqdordan ko'p (${orig.quantity}) qaytarib/almashtirib bo'lmaydi`);
            }

            if (actionType === 'RETURN' || actionType === 'EXCHANGE') {
              const remainingQty = Math.max(0, Number(orig.quantity) - Number(quantity));
              if (remainingQty === 0) {
                // Instead of deleting, mark as returned with status
                await prisma.transactionItem.update({
                  where: { id: orig.id },
                  data: {
                    quantity: 0,
                    total: 0,
                    status: 'RETURNED' // Add status field to track returned items
                  }
                });
              } else {
                const unitPrice = (orig.sellingPrice ?? orig.price) || 0;
                await prisma.transactionItem.update({
                  where: { id: orig.id },
                  data: {
                    quantity: remainingQty,
                    total: remainingQty * unitPrice
                  }
                });
              }
            }

            if (actionType === 'EXCHANGE') {
              const replacementQty = Math.max(1, Number(replacementQuantity || quantity) || quantity);

              const replProdId = Number(exchangeWithProductId);
              const replPrice = Number(replacementUnitPrice ?? 0);

              // Idempotency/merge guard: if a replacement item with same product and price was just added, update it instead of creating duplicate
              const existingRepl = await prisma.transactionItem.findFirst({
                where: { transactionId: tx.id, productId: replProdId, price: replPrice },
                orderBy: { createdAt: 'desc' }
              });

              if (existingRepl) {
                await prisma.transactionItem.update({
                  where: { id: existingRepl.id },
                  data: {
                    quantity: existingRepl.quantity + replacementQty,
                    total: (existingRepl.quantity + replacementQty) * (existingRepl.sellingPrice ?? existingRepl.price)
                  }
                });
              } else {
                // add new replacement item
                await prisma.transactionItem.create({
                  data: {
                    transactionId: tx.id,
                    productId: replProdId,
                    quantity: replacementQty,
                    price: replPrice,
                    sellingPrice: replPrice,
                    originalPrice: replPrice,
                    total: replacementQty * replPrice
                  }
                });
              }

              // decrement stock for replacement product by replacementQty
              const repl = await prisma.product.findUnique({ where: { id: replProdId } });
              if (!repl) {
                throw new NotFoundException('Almashtiriladigan mahsulot topilmadi');
              }
              if (replacementQty > repl.quantity) {
                throw new BadRequestException(`Almashtirish miqdori mavjud miqdordan ko'p. Mavjud: ${repl.quantity}, so'ralgan: ${replacementQty}`);
              }
              await prisma.product.update({
                where: { id: repl.id },
                data: { quantity: Math.max(0, repl.quantity - replacementQty) }
              });
            }
            
            // Recalculate totals
            const newItems = await prisma.transactionItem.findMany({ where: { transactionId: tx.id } });
            const newTotal = newItems.reduce((s, it) => s + it.total, 0);
            await prisma.transaction.update({
              where: { id: tx.id },
              data: { total: newTotal, finalTotal: newTotal }
            });

            // Recalculate payment schedules for credit/installment transactions
            if (tx.paymentType === 'CREDIT' || tx.paymentType === 'INSTALLMENT') {
              await this.recalculatePaymentSchedules(tx.id);
            }
          }
        }
      }

      // Update branch cash balance
      if (branchId) {
        await prisma.branch.update({
          where: { id: branchId },
          data: {
            cashBalance: {
              increment: cashAmount
            }
          }
        });
      }

      return defectiveLog;
    });

    return result;
  }

  async findAll(query: any = {}) {
    const { branchId, actionType, startDate, endDate } = query;
    
    const where: any = {};
    
    if (branchId) {
      where.branchId = parseInt(branchId);
    }
    
    if (actionType) {
      where.actionType = actionType;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    return this.prisma.defectiveLog.findMany({
      where,
      include: {
        product: true,
        user: true,
        branch: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findByProduct(productId: number) {
    return this.prisma.defectiveLog.findMany({
      where: { productId },
      include: {
        product: true,
        user: true,
        branch: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findOne(id: number) {
    const defectiveLog = await this.prisma.defectiveLog.findUnique({
      where: { id },
      include: {
        product: true,
        user: true,
        branch: true
      }
    });

    if (!defectiveLog) {
      throw new NotFoundException('Defective log topilmadi');
    }

    return defectiveLog;
  }

  async update(id: number, updateDefectiveLogDto: UpdateDefectiveLogDto) {
    const defectiveLog = await this.findOne(id);

    return this.prisma.defectiveLog.update({
      where: { id },
      data: updateDefectiveLogDto,
      include: {
        product: true,
        user: true,
        branch: true
      }
    });
  }

  async markAsFixed(productId: number, quantity: number, userId?: number, branchId?: number) {
    return this.create({
      productId,
      quantity,
      description: 'Mahsulot tuzatildi',
      userId,
      branchId,
      actionType: 'FIXED'
    });
  }

  async returnProduct(productId: number, quantity: number, description: string, userId?: number, branchId?: number) {
    return this.create({
      productId,
      quantity,
      description,
      userId,
      branchId,
      actionType: 'RETURN'
    });
  }

  async exchangeProduct(productId: number, quantity: number, description: string, userId?: number, branchId?: number) {
    return this.create({
      productId,
      quantity,
      description,
      userId,
      branchId,
      actionType: 'EXCHANGE'
    });
  }

  async remove(id: number) {
    const defectiveLog = await this.findOne(id);

    return this.prisma.defectiveLog.delete({
      where: { id }
    });
  }

  async getDefectiveProducts(branchId?: number) {
    const where: any = {
      status: ProductStatus.DEFECTIVE
    };
    
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        branch: true,
        DefectiveLog: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

  async getFixedProducts(branchId?: number) {
    const where: any = {
      status: ProductStatus.FIXED
    };
    
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        branch: true,
        DefectiveLog: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

  async getReturnedProducts(branchId?: number) {
    const where: any = {
      status: ProductStatus.RETURNED
    };
    
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        branch: true,
        DefectiveLog: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

  async getExchangedProducts(branchId?: number) {
    const where: any = {
      status: ProductStatus.EXCHANGED
    };
    
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        branch: true,
        DefectiveLog: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

  // Get statistics for dashboard
  async getStatistics(branchId?: number, startDate?: string, endDate?: string) {
    const where: any = {};
    
    if (branchId) {
      where.branchId =branchId;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [defectiveStats, fixedStats, returnStats, exchangeStats, cashFlow] = await Promise.all([
      // Defective products
      this.prisma.defectiveLog.aggregate({
        where: { ...where, actionType: 'DEFECTIVE' },
        _sum: { quantity: true, cashAmount: true },
        _count: true
      }),
      // Fixed products
      this.prisma.defectiveLog.aggregate({
        where: { ...where, actionType: 'FIXED' },
        _sum: { quantity: true, cashAmount: true },
        _count: true
      }),
      // Returned products
      this.prisma.defectiveLog.aggregate({
        where: { ...where, actionType: 'RETURN' },
        _sum: { quantity: true, cashAmount: true },
        _count: true
      }),
      // Exchanged products
      this.prisma.defectiveLog.aggregate({
        where: { ...where, actionType: 'EXCHANGE' },
        _sum: { quantity: true, cashAmount: true },
        _count: true
      }),
      // Total cash flow
      this.prisma.defectiveLog.aggregate({
        where,
        _sum: { cashAmount: true }
      })
    ]);

    return {
      defectiveProducts: {
        quantity: defectiveStats._sum.quantity || 0,
        cashAmount: defectiveStats._sum.cashAmount || 0,
        count: defectiveStats._count || 0
      },
      fixedProducts: {
        quantity: fixedStats._sum.quantity || 0,
        cashAmount: fixedStats._sum.cashAmount || 0,
        count: fixedStats._count || 0
      },
      returnedProducts: {
        quantity: returnStats._sum.quantity || 0,
        cashAmount: returnStats._sum.cashAmount || 0,
        count: returnStats._count || 0
      },
      exchangedProducts: {
        quantity: exchangeStats._sum.quantity || 0,
        cashAmount: exchangeStats._sum.cashAmount || 0,
        count: exchangeStats._count || 0
      },
      totalCashFlow: cashFlow._sum.cashAmount || 0
    };
  }
}
