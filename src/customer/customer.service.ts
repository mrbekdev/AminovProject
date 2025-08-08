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

    const [firstName, ...lastNameParts] = customerName.split(' ');
    const lastName = lastNameParts.join(' ') || 'Unknown';
    const email = `${customerName.replace(/\s+/g, '').toLowerCase()}@example.com`;

    return this.prisma.customer.upsert({
      where: { email },
      update: { firstName, lastName, updatedAt: new Date() },
      create: {
        firstName,
        lastName,
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
        firstName: createCustomerDto.firstName,
        lastName: createCustomerDto.lastName,
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

  async findAll(skip: number, take: number, filters?: { phone?: string; email?: string }) {
    return this.prisma.customer.findMany({
      skip,
      take,
      where: filters,
      include: { transactions: { include: { items: { include: { product: true } } } } },
    });
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    return this.prisma.customer.update({
      where: { id },
      data: {
        firstName: updateCustomerDto.firstName,
        lastName: updateCustomerDto.lastName,
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