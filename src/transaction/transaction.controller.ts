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
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException('Unauthorized: User ID not found in request', HttpStatus.UNAUTHORIZED);
      }
      return await this.transactionService.create(createTransactionDto, userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create transaction',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('api/sales')
  @ApiOperation({ summary: 'Create a new sale transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createSale(@Body() createTransactionDto: CreateTransactionDto, @Request() req) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException('Unauthorized: User ID not found in request', HttpStatus.UNAUTHORIZED);
      }
      createTransactionDto.type = TransactionType.SALE;
      return await this.transactionService.create(createTransactionDto, userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create sale transaction',
        error.status || HttpStatus.BAD_REQUEST
      );
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findStockHistory(
    @Query('skip') skip = '0',
    @Query('take') take = '100',
    @Query('productId') productId?: string,
    @Query('branchId') branchId?: string,
    @Query('type') type?: StockHistoryType,
    @Query('userId') userId?: string,
    @Request() req?: any
  ) {
    try {
      // Validate query parameters
      const parsedSkip = parseInt(skip, 10);
      const parsedTake = parseInt(take, 10);
      if (isNaN(parsedSkip) || parsedSkip < 0) {
        throw new HttpException('Invalid skip parameter', HttpStatus.BAD_REQUEST);
      }
      if (isNaN(parsedTake) || parsedTake <= 0) {
        throw new HttpException('Invalid take parameter', HttpStatus.BAD_REQUEST);
      }

      // Validate type parameter
      if (type && !Object.values(StockHistoryType).includes(type)) {
        throw new HttpException(`Invalid stock history type: ${type}`, HttpStatus.BAD_REQUEST);
      }

      // Extract authenticated user ID from JWT
      const authUserId = req?.user?.id;
      if (!authUserId) {
        throw new HttpException('Unauthorized: User ID not found in request', HttpStatus.UNAUTHORIZED);
      }

      // Parse userId if provided
      const filterUserId = userId ? parseInt(userId, 10) : authUserId;
      if (userId && isNaN(filterUserId)) {
        throw new HttpException('Invalid userId parameter', HttpStatus.BAD_REQUEST);
      }

      return await this.transactionService.findStockHistory(parsedSkip, parsedTake, {
        productId: productId ? parseInt(productId, 10) : undefined,
        branchId: branchId ? parseInt(branchId, 10) : undefined,
        type,
        userId: filterUserId,
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve stock history',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction details' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id') id: string) {
    try {
      return await this.transactionService.findOne(parseInt(id, 10));
    } catch (error) {
      throw new HttpException(
        error.message || 'Transaction not found',
        error.status || HttpStatus.NOT_FOUND
      );
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
    try {
      const parsedSkip = parseInt(skip, 10);
      const parsedTake = parseInt(take, 10);
      if (isNaN(parsedSkip) || parsedSkip < 0) {
        throw new HttpException('Invalid skip parameter', HttpStatus.BAD_REQUEST);
      }
      if (isNaN(parsedTake) || parsedTake <= 0) {
        throw new HttpException('Invalid take parameter', HttpStatus.BAD_REQUEST);
      }
      return await this.transactionService.findAll(parsedSkip, parsedTake, {
        customerId: customerId ? parseInt(customerId, 10) : undefined,
        userId: userId ? parseInt(userId, 10) : undefined,
        type,
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve transactions',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update transaction' })
  @ApiResponse({ status: 200, description: 'Transaction updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto, @Request() req) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException('Unauthorized: User ID not found in request', HttpStatus.UNAUTHORIZED);
      }
      return await this.transactionService.update(parseInt(id, 10), updateTransactionDto, userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update transaction',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete transaction' })
  @ApiResponse({ status: 200, description: 'Transaction deleted' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async remove(@Param('id') id: string, @Request() req) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException('Unauthorized: User ID not found in request', HttpStatus.UNAUTHORIZED);
      }
      return await this.transactionService.remove(parseInt(id, 10), userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete transaction',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }
}