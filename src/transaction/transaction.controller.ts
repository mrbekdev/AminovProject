import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionType, StockHistoryType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createTransactionDto: CreateTransactionDto, @Request() req) {
    try {
      const userId = req.user.id; // Extract user ID from JWT
      return await this.transactionService.create(createTransactionDto, userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('api/sales')
  @ApiOperation({ summary: 'Create a new sale transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createSale(@Body() createTransactionDto: CreateTransactionDto, @Request() req) {
    try {
      const userId = req.user.id;
      createTransactionDto.type = TransactionType.SALE;
      return await this.transactionService.create(createTransactionDto, userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('stock-history')
  @ApiOperation({ summary: 'Get product stock history' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Number of records to take' })
  @ApiQuery({ name: 'productId', required: false, type: Number, description: 'Filter by product ID' })
  @ApiQuery({ name: 'branchId', required: false, type: Number, description: 'Filter by branch ID' })
  @ApiQuery({ name: 'type', required: false, enum: StockHistoryType, description: 'Filter by stock history type' })
  @ApiQuery({ name: 'userId', required: false, type: Number, description: 'Filter by user ID who created the stock history' })
  @ApiResponse({ status: 200, description: 'Stock history retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
async findStockHistory(
  @Query('skip') skip = '0',
  @Query('take') take = '100',
  @Query('productId') productId?: string,
  @Query('branchId') branchId?: string,
  @Query('type') type?: StockHistoryType,
  @Query('userId') userId?: string,
  @Request() req?
){
    try {
      // Validate the 'type' parameter to ensure it's a valid StockHistoryType
      if (type && !Object.values(StockHistoryType).includes(type)) {
        throw new HttpException(`Invalid stock history type: ${type}`, HttpStatus.BAD_REQUEST);
      }

      // Extract authenticated user ID from JWT
      const authUserId = req.user?.id;
      if (!authUserId) {
        throw new HttpException('Unauthorized: User ID not found in request', HttpStatus.UNAUTHORIZED);
      }

      // Use query userId if provided, otherwise fall back to authenticated user ID
      const filterUserId = userId ? +userId : authUserId;

      return await this.transactionService.findStockHistory(+skip, +take, {
        productId: productId ? +productId : undefined,
        branchId: branchId ? +branchId : undefined,
        type,
        userId: filterUserId,
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction details' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id') id: string) {
    try {
      return await this.transactionService.findOne(+id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  async findAll(
    @Query('skip') skip = '0',
    @Query('take') take = '10',
    @Query('customerId') customerId?: string,
    @Query('userId') userId?: string,
    @Query('type') type?: TransactionType,
  ) {
    return this.transactionService.findAll(+skip, +take, {
      customerId: customerId ? +customerId : undefined,
      userId: userId ? +userId : undefined,
      type,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update transaction' })
  @ApiResponse({ status: 200, description: 'Transaction updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto, @Request() req) {
    try {
      const userId = req.user.id; // Extract user ID from JWT
      return await this.transactionService.update(+id, updateTransactionDto, userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete transaction' })
  @ApiResponse({ status: 200, description: 'Transaction deleted' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async remove(@Param('id') id: string, @Request() req) {
    try {
      const userId = req.user.id; // Extract user ID from JWT
      return await this.transactionService.remove(+id, userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}