import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionBonusProductDto } from './dto/create-transaction-bonus-product.dto';
import { UpdateTransactionBonusProductDto } from './dto/update-transaction-bonus-product.dto';

@Injectable()
export class TransactionBonusProductService {
  constructor(private prisma: PrismaService) {}

  private async getUsdToUzsRate(branchId?: number): Promise<number> {
    // Read latest active USD->UZS rate. If branchId-specific rate exists, prefer it; otherwise fallback to global
    const byBranch = await this.prisma.currencyExchangeRate.findMany({
      where: { fromCurrency: 'USD', toCurrency: 'UZS', isActive: true, branchId: branchId ?? undefined },
      orderBy: { updatedAt: 'desc' },
      take: 1,
    });
    if (byBranch?.[0]?.rate) return byBranch[0].rate;
    const global = await this.prisma.currencyExchangeRate.findMany({
      where: { fromCurrency: 'USD', toCurrency: 'UZS', isActive: true, branchId: null },
      orderBy: { updatedAt: 'desc' },
      take: 1,
    });
    return global?.[0]?.rate ?? 1;
  }

  async create(createTransactionBonusProductDto: CreateTransactionBonusProductDto) {
    const { transactionId, productId, quantity } = createTransactionBonusProductDto;


    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.quantity < quantity) {
      throw new Error('Insufficient product quantity');
    }

    // Create bonus product record and update product quantity in a transaction
    return this.prisma.$transaction(async (prisma) => {
      // Create bonus product record
      const bonusProduct = await prisma.transactionBonusProduct.create({
        data: {
          transactionId,
          productId,
          quantity,
        },
        include: {
          product: true,
          transaction: true,
        },
      });

      // Deduct quantity from product inventory
      await prisma.product.update({
        where: { id: productId },
        data: {
          quantity: {
            decrement: quantity,
          },
        },
      });

      return bonusProduct;
    });
  }

  async createMultiple(transactionId: number, bonusProducts: { productId: number; quantity: number }[]) {
    return this.prisma.$transaction(async (prisma) => {
      const createdBonusProducts: any[] = [];

      for (const bonusProduct of bonusProducts) {
        // Check if product exists and has enough quantity
        const product = await prisma.product.findUnique({
          where: { id: bonusProduct.productId },
        });

        if (!product) {
          throw new Error(`Product with ID ${bonusProduct.productId} not found`);
        }

        if (product.quantity < bonusProduct.quantity) {
          throw new Error(`Insufficient quantity for product ${product.name}`);
        }

        // Create the bonus product
        const createdBonusProduct = await prisma.transactionBonusProduct.create({
          data: {
            transactionId,
            productId: bonusProduct.productId,
            quantity: bonusProduct.quantity,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                model: true,
                barcode: true,
                price: true,
                quantity: true,
              },
            },
          },
        });


        // Deduct quantity from product inventory
        const updatedProduct = await prisma.product.update({
          where: { id: bonusProduct.productId },
          data: {
            quantity: {
              decrement: bonusProduct.quantity,
            },
          },
          select: { id: true, name: true, quantity: true }
        });


        createdBonusProducts.push(createdBonusProduct);
      }

      return createdBonusProducts;
    });
  }

  async findAll() {
    return this.prisma.transactionBonusProduct.findMany({
      include: {
        product: true,
        transaction: true,
      },
    });
  }

  async findByTransactionId(transactionId: number) {
    
    const bonusProducts = await this.prisma.transactionBonusProduct.findMany({
      where: { transactionId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            model: true,
            barcode: true,
            price: true,
            quantity: true,
          },
        },
        transaction: {
          select: { id: true, fromBranchId: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (bonusProducts.length > 0) {
      bonusProducts.forEach((bp, index) => {
      });
    } else {
    }

    // Convert USD prices to UZS using latest rate for branch
    const rate = await this.getUsdToUzsRate(bonusProducts[0]?.transaction?.fromBranchId ?? undefined);
    return bonusProducts.map((bp) => ({
      ...bp,
      product: bp.product ? { ...bp.product, priceUZS: Math.round((bp.product.price || 0) * rate) } as any : null,
      totalValueUZS: Math.round((bp.product?.price || 0) * rate * bp.quantity),
      usdToUzsRate: rate,
    }));
  }

  async checkTransactionExists(transactionId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { id: true, type: true, createdAt: true },
    });
    
    if (transaction) {
    } else {
    }
    
    return transaction;
  }

  async findOne(id: number) {
    return this.prisma.transactionBonusProduct.findUnique({
      where: { id },
      include: {
        product: true,
        transaction: true,
      },
    });
  }

  async update(id: number, updateTransactionBonusProductDto: UpdateTransactionBonusProductDto) {
    return this.prisma.transactionBonusProduct.update({
      where: { id },
      data: updateTransactionBonusProductDto,
      include: {
        product: true,
        transaction: true,
      },
    });
  }

  async remove(id: number) {
    // Get the bonus product to restore quantity
    const bonusProduct = await this.prisma.transactionBonusProduct.findUnique({
      where: { id },
    });

    if (!bonusProduct) {
      throw new Error('Bonus product not found');
    }

    return this.prisma.$transaction(async (prisma) => {
      // Restore quantity to product inventory
      await prisma.product.update({
        where: { id: bonusProduct.productId },
        data: {
          quantity: {
            increment: bonusProduct.quantity,
          },
        },
      });

      // Delete bonus product record
      return prisma.transactionBonusProduct.delete({
        where: { id },
      });
    });
  }

  async getTotalBonusProductsValueByUserId(userId: number, startDate?: string, endDate?: string) {
    
    // Build where clause for filtering
    const whereClause: any = {
      transaction: {
        soldByUserId: userId,
      },
    };

    // Add date filtering if provided
    if (startDate || endDate) {
      whereClause.transaction.createdAt = {};
      if (startDate) {
        whereClause.transaction.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.transaction.createdAt.lte = new Date(endDate);
      }
    }

    const bonusProducts = await this.prisma.transactionBonusProduct.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            model: true,
            price: true,
          },
        },
        transaction: {
          select: {
            id: true,
            createdAt: true,
            soldByUserId: true,
            fromBranchId: true,
          },
        },
      },
    });


    // Determine rate (prefer branch-specific)
    const rate = await this.getUsdToUzsRate(bonusProducts[0]?.transaction?.fromBranchId ?? undefined);

    // Calculate total value in UZS
    const totalValueUZS = bonusProducts.reduce((sum, bonusProduct) => {
      const unitUZS = (bonusProduct.product?.price || 0) * rate;
      const productValue = unitUZS * bonusProduct.quantity;
      return sum + productValue;
    }, 0);


    return {
      totalValueUZS,
      usdToUzsRate: rate,
      totalProducts: bonusProducts.length,
      bonusProducts: bonusProducts.map(bp => ({
        id: bp.id,
        transactionId: bp.transactionId,
        productId: bp.productId,
        quantity: bp.quantity,
        productName: bp.product?.name,
        productPriceUSD: bp.product?.price,
        productPriceUZS: Math.round((bp.product?.price || 0) * rate),
        totalProductValueUZS: Math.round((bp.product?.price || 0) * rate * bp.quantity),
        transactionDate: bp.transaction.createdAt,
      })),
    };
  }

  async createFromDescription(transactionId: number, bonusDescription: string) {

    // Check if transaction exists with retries (to handle async creation / replica lag)
    const maxRetries = 5;
    const delayMs = 400;
    let transaction: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      transaction = await this.checkTransactionExists(transactionId);
      if (transaction) break;
      await new Promise((res) => setTimeout(res, delayMs));
    }
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Check if bonus products already exist for this transaction
    const existingBonusProducts = await this.findByTransactionId(transactionId);
    if (existingBonusProducts.length > 0) {
      return existingBonusProducts;
    }

    // Parse bonus products from description
    const bonusProductsData = this.parseBonusProductsFromDescription(bonusDescription);
    
    if (bonusProductsData.length === 0) {
      return [];
    }


    // Create bonus products using existing createMultiple method
    try {
      const createdBonusProducts = await this.createMultiple(transactionId, bonusProductsData);
      return createdBonusProducts;
    } catch (error) {
      // If creation fails due to inventory issues, create a generic bonus product entry
      return this.createGenericBonusProducts(transactionId, bonusProductsData);
    }
  }

  private parseBonusProductsFromDescription(description: string): { productId: number; quantity: number }[] {
    const bonusProducts: { productId: number; quantity: number }[] = [];
    
    
    // Parse different formats of bonus product descriptions
    // Format 1: "Bonus mahsulotlar: Product1 x2, Product2 x1"
    const bonusProductsMatch = description.match(/Bonus mahsulotlar:\s*([^.]+)/);
    if (bonusProductsMatch) {
      const productsText = bonusProductsMatch[1];
      const productMatches = productsText.match(/([^,]+)\s*x(\d+)/g);
      
      if (productMatches) {
        productMatches.forEach((match, index) => {
          const [, productName, quantityStr] = match.match(/([^,]+)\s*x(\d+)/) || [];
          if (productName && quantityStr) {
            bonusProducts.push({
              productId: 1, // Using generic product ID for now
              quantity: parseInt(quantityStr)
            });
          }
        });
      }
    }

    // Format 2: Extract total value and create multiple bonus products based on value
    const valueMatch = description.match(/Bonus mahsulotlar qiymati:\s*([\d,]+)/);
    if (valueMatch && bonusProducts.length === 0) {
      const totalValue = parseInt(valueMatch[1].replace(/,/g, ''));
      
      // Create multiple bonus products based on value ranges
      if (totalValue > 0) {
        if (totalValue >= 200000) {
          // High value: create multiple different products
          bonusProducts.push(
            { productId: 1, quantity: 2 },
            { productId: 2, quantity: 1 },
            { productId: 3, quantity: 1 }
          );
        } else if (totalValue >= 100000) {
          // Medium value: create 2 products
          bonusProducts.push(
            { productId: 1, quantity: 2 },
            { productId: 2, quantity: 1 }
          );
        } else if (totalValue >= 50000) {
          // Low value: create 1-2 products
          bonusProducts.push({ productId: 1, quantity: 1 });
        } else {
          // Very low value: create 1 product
          bonusProducts.push({ productId: 1, quantity: 1 });
        }
      }
    }

    // Format 3: Look for any mention of bonus products value in som
    if (bonusProducts.length === 0) {
      const somMatch = description.match(/([\d,]+)\s*so[ʻ']m/i);
      if (somMatch) {
        const value = parseInt(somMatch[1].replace(/,/g, ''));
        if (value > 10000) { // Only if value is significant
          if (value >= 200000) {
            bonusProducts.push(
              { productId: 1, quantity: 2 },
              { productId: 2, quantity: 1 }
            );
          } else if (value >= 100000) {
            bonusProducts.push({ productId: 1, quantity: 2 });
          } else {
            bonusProducts.push({ productId: 1, quantity: 1 });
          }
        }
      }
    }

    return bonusProducts;
  }

  private async createGenericBonusProducts(transactionId: number, bonusProductsData: { productId: number; quantity: number }[]): Promise<any[]> {
    
    // Find any available products to use as bonus products
    const availableProducts = await this.prisma.product.findMany({
      where: {
        quantity: { gt: 0 }
      },
      select: { id: true, name: true, model: true, price: true, barcode: true },
      take: 10,
      orderBy: { price: 'asc' } // Start with cheaper products for bonuses
    });

    if (availableProducts.length === 0) {
      return [];
    }

    const createdBonusProducts: any[] = [];
    
    for (const bonusProductData of bonusProductsData) {
      // Use different products for variety, cycling through available products
      const productIndex = createdBonusProducts.length % availableProducts.length;
      const selectedProduct = availableProducts[productIndex];
      
      const bonusProduct = await this.prisma.transactionBonusProduct.create({
        data: {
          transactionId,
          productId: selectedProduct.id,
          quantity: bonusProductData.quantity,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              barcode: true,
              price: true,
              quantity: true,
            },
          },
        },
      });

      createdBonusProducts.push(bonusProduct);
    }

    return createdBonusProducts;
  }
}
