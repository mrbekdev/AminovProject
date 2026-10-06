import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCurrencyExchangeRateDto } from './dto/create-currency-exchange-rate.dto';
import { UpdateCurrencyExchangeRateDto } from './dto/update-currency-exchange-rate.dto';

@Injectable()
export class CurrencyExchangeRateService {
  private rateCache = new Map<string, { rate: number; expiresAt: number }>();

  constructor(private prisma: PrismaService) {}

  private clearCache() {
    this.rateCache.clear();
  }

  async create(createCurrencyExchangeRateDto: CreateCurrencyExchangeRateDto, userId: number) {
    this.clearCache();
    return this.prisma.currencyExchangeRate.create({
      data: {
        ...createCurrencyExchangeRateDto,
        createdBy: userId,
      },
      include: {
        branch: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(branchId?: number) {
    const where: any = { isActive: true };
    
    if (branchId) {
      where.OR = [
        { branchId: branchId },
        { branchId: null }, // Global rates
      ];
    }

    return this.prisma.currencyExchangeRate.findMany({
      where,
      include: {
        branch: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.currencyExchangeRate.findUnique({
      where: { id },
      include: {
        branch: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getActiveRate(fromCurrency: string, toCurrency: string, branchId?: number) {
    const where: any = {
      fromCurrency,
      toCurrency,
      isActive: true,
    };
    
    if (branchId) {
      where.OR = [
        { branchId: branchId },
        { branchId: null }, // Global rates
      ];
    }

    return this.prisma.currencyExchangeRate.findFirst({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByCurrencies(fromCurrency: string, toCurrency: string, branchId?: number) {
    const where: any = {
      fromCurrency,
      toCurrency,
      isActive: true,
    };
    
    if (branchId) {
      where.OR = [
        { branchId: branchId },
        { branchId: null }, // Global rates
      ];
    }

    return this.prisma.currencyExchangeRate.findFirst({
      where,
      orderBy: [
        { branchId: 'desc' }, // Branch-specific rates first
        { createdAt: 'desc' },
      ],
    });
  }

  async update(id: number, updateCurrencyExchangeRateDto: UpdateCurrencyExchangeRateDto) {
    this.clearCache();
    return this.prisma.currencyExchangeRate.update({
      where: { id },
      data: updateCurrencyExchangeRateDto,
      include: {
        branch: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    this.clearCache();
    return this.prisma.currencyExchangeRate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getCurrentRate(fromCurrency: string, toCurrency: string, branchId?: number) {
    const key = `${fromCurrency}_${toCurrency}_${branchId || 'global'}`;
    const cached = this.rateCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.rate;
    }
    const rateRecord = await this.findByCurrencies(fromCurrency, toCurrency, branchId);
    const rateVal = rateRecord?.rate || 1;
    this.rateCache.set(key, { rate: rateVal, expiresAt: Date.now() + 60000 });
    return rateVal;
  }

  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string, branchId?: number) {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rate = await this.getCurrentRate(fromCurrency, toCurrency, branchId);
    return amount * rate;
  }
}
