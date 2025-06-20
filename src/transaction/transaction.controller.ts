import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionType } from '@prisma/client';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  async create(@Body() createTransactionDto: CreateTransactionDto) {
    try {
      return await this.transactionService.create(createTransactionDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const transaction = await this.transactionService.findOne(+id);
    if (!transaction) throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    return transaction;
  }

  @Get()
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
  async update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto) {
    try {
      return await this.transactionService.update(+id, updateTransactionDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.transactionService.remove(+id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}