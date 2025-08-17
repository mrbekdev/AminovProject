import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async createOrFindByName(customerName: string) {
    if (!customerName || customerName === 'Номаълум Мижоз') {
      return null;
    }

    const email = `${customerName.replace(/\s+/g, '').toLowerCase()}@example.com`;

    return this.prisma.customer.upsert({
      where: { email },
      update: { fullName: customerName, updatedAt: new Date() },
      create: {
        fullName: customerName,
        email,
        phone: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async create(createCustomerDto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        fullName: createCustomerDto.fullName,
        phone: createCustomerDto.phone || '',
        address: createCustomerDto.address,
        email: createCustomerDto.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { transactions: { include: { items: { include: { product: true } } } } },
    });
    if (!customer) throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
    return customer;
  }

  async findAll(skip: number, take: number, filters?: { phone?: string; email?: string; fullName?: string }) {
    let where: any = {};
    
    if (filters?.phone) {
      where.phone = { contains: filters.phone, mode: 'insensitive' };
    }
    
    if (filters?.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }
    
    if (filters?.fullName) {
      where.OR = [
        { fullName: { contains: filters.fullName, mode: 'insensitive' } },
        { firstName: { contains: filters.fullName, mode: 'insensitive' } },
        { lastName: { contains: filters.fullName, mode: 'insensitive' } }
      ];
    }

    return this.prisma.customer.findMany({
      skip,
      take,
      where,
      include: { transactions: { include: { items: { include: { product: true } } } } },
    });
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    return this.prisma.customer.update({
      where: { id },
      data: {
        fullName: updateCustomerDto.fullName,
        phone: updateCustomerDto.phone,
        address: updateCustomerDto.address,
        email: updateCustomerDto.email,
        updatedAt: new Date(),
      },
    });
  }

  async remove(id: number) {
    return this.prisma.customer.delete({ where: { id } });
  }
}