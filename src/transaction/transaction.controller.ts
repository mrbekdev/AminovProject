import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  HttpException, HttpStatus, UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) { }

  @Post()
  @ApiOperation({ summary: 'Yangi tranzaksiya yaratish' })
  @ApiResponse({ status: 201, description: 'Tranzaksiya yaratildi' })
  @ApiResponse({ status: 400, description: 'Xato so\'rov' })
  async create(@Body() createTransactionDto: CreateTransactionDto) {
    try {
      return await this.transactionService.create(createTransactionDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Tranzaksiya maʼlumotini olish' })
  @ApiResponse({ status: 200, description: 'Tranzaksiya topildi' })
  @ApiResponse({ status: 404, description: 'Topilmadi' })
  async findOne(@Param('id') id: string) {
    const transaction = await this.transactionService.findOne(+id);
    if (!transaction) throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    return transaction;
  }

  @Get()
  @ApiOperation({ summary: 'Barcha tranzaksiyalarni olish' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  async findAll(
    @Query('skip') skip = '0',
    @Query('take') take = '10',
    @Query('productId') productId?: string,
    @Query('userId') userId?: string,
    @Query('type') type?: TransactionType,
  ) {
    return this.transactionService.findAll(+skip, +take, { productId: productId ? +productId : undefined, userId: userId ? +userId : undefined, type });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Tranzaksiyani tahrirlash' })
  async update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto) {
    try {
      return await this.transactionService.update(+id, updateTransactionDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Tranzaksiyani o\'chirish' })
  async remove(@Param('id') id: string) {
    try {
      return await this.transactionService.remove(+id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}