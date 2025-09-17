import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

async findAll(skip: number, take: number) {
  return this.prisma.user.findMany({
    skip,
    take,
    where: {
      status: {
        not: 'DELETED', // DELETED bo'lmaganlarni qaytaradi
      },
    },
    include: { branch: true },
  });
}

async findOne(id: number) {
  return this.prisma.user.findUnique({
    where: {
      id,
      status: {
        not: 'DELETED', // id bo'yicha va DELETED bo'lmagan foydalanuvchini qaytaradi
      } as any, // findUnique faqat unique maydonlarga ruxsat beradi, shuning uchun boshqa usul ham bor
    },
    include: { branch: true },
  });
}


  async update(id: number, updateUserDto: UpdateUserDto) {
    let data = { ...updateUserDto, updatedAt: new Date() };
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    const findUser = await this.prisma.user.findUnique({ where: { id } });
    if (!findUser) throw new Error('User not found');
    return this.prisma.user.update({
      where: { id },
      data: { status: 'DELETED', updatedAt: new Date() },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }
}