// transaction.controller.ts
import { Controller, Get, Param, Query, Request, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { StockHistoryType, TransactionType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  // Yangi endpoint - oddiy ro'yxat olish uchun (query parametrlarsiz)
  @Get('list/:skip/:take')
  @ApiOperation({ summary: 'Get transactions list with simple pagination (no filters)' })
  @ApiParam({ name: 'skip', type: Number, description: 'Number of records to skip', example: 0 })
  @ApiParam({ name: 'take', type: Number, description: 'Number of records to take', example: 20 })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTransactionsList(
    @Param('skip') skip: string,
    @Param('take') take: string,
    @Request() req,
  ) {
    try {
      const skipNum = parseInt(skip, 10);
      const takeNum = parseInt(take, 10);

      if (isNaN(skipNum) || isNaN(takeNum) || skipNum < 0 || takeNum <= 0) {
        throw new HttpException('Invalid skip or take parameters', HttpStatus.BAD_REQUEST);
      }

      const authUserId = req.user?.userId;
      if (!authUserId) {
        console.error('JWT token validation failed: User ID not found in token payload');
        throw new HttpException('Unauthorized: User ID not found in token', HttpStatus.UNAUTHORIZED);
      }

      // Faqat foydalanuvchining o'z ma'lumotlarini qaytarish
      const filters = { userId: authUserId };
      const transactions = await this.transactionService.findAll(skipNum, takeNum, filters);
      const total = await this.transactionService.countTransactions(filters);

      return { transactions, total };
    } catch (error) {
      console.error('Error in getTransactionsList:', error.message);
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // Mavjud endpoint - filter bilan (optional query parameters)
  @Get('search')
  @ApiOperation({ summary: 'Get transactions with optional filters and pagination' })
  @ApiQuery({ name: 'userId', type: Number, required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'customerId', type: Number, required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'type', enum: TransactionType, required: false, description: 'Filter by transaction type' })
  @ApiQuery({ name: 'startDate', type: String, required: false, description: 'Filter by start date (ISO format)' })
  @ApiQuery({ name: 'endDate', type: String, required: false, description: 'Filter by end date (ISO format)' })
  @ApiQuery({ name: 'sortBy', type: String, required: false, description: 'Sort by field (e.g., createdAt)', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', enum: ['asc', 'desc'], required: false, description: 'Sort order', example: 'desc' })
  @ApiQuery({ name: 'skip', type: Number, required: false, description: 'Number of records to skip', example: 0 })
  @ApiQuery({ name: 'take', type: Number, required: false, description: 'Number of records to take', example: 20 })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchTransactions(
    @Query('userId') userId?: string,
    @Query('customerId') customerId?: string,
    @Query('type') type?: TransactionType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
    @Request() req?: any, // Request object to access JWT token
  ) {
    try {
      const userIdNum = userId ? parseInt(userId, 10) : undefined;
      const customerIdNum = customerId ? parseInt(customerId, 10) : undefined;
      const skipNum = parseInt(skip, 10);
      const takeNum = parseInt(take, 10);

      // Validation fix: check for parsing errors properly
      if ((userId && userIdNum) || (customerId && customerIdNum) || 
          isNaN(skipNum) || isNaN(takeNum) || skipNum < 0 || takeNum <= 0) {
        throw new HttpException('Invalid query parameters', HttpStatus.BAD_REQUEST);
      }

      const authUserId = req.user?.userId;
      if (!authUserId) {
        console.error('JWT token validation failed: User ID not found in token payload');
        throw new HttpException('Unauthorized: User ID not found in token', HttpStatus.UNAUTHORIZED);
      }

      // Restrict to authenticated user's data
      if (userIdNum && userIdNum !== authUserId) {
        console.warn(`User ${authUserId} attempted to access transactions for user ${userIdNum}`);
        throw new HttpException('Forbidden: Cannot access other users\' data', HttpStatus.FORBIDDEN);
      }

      const filters: any = {
        userId: userIdNum || authUserId,
        customerId: customerIdNum,
        type,
      };

      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.gte = new Date(startDate);
        if (endDate) filters.createdAt.lte = new Date(endDate);
      }

      const transactions = await this.transactionService.findAll(skipNum, takeNum, filters, sortBy, sortOrder);
      const total = await this.transactionService.countTransactions(filters);

      return { transactions, total };
    } catch (error) {
      console.error('Error in searchTransactions:', error.message);
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // Bitta transaction olish uchun
  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionById(@Param('id') id: string, @Request() req) {
    try {
      const idNum = parseInt(id, 10);
      if (isNaN(idNum)) {
        throw new HttpException('Invalid transaction ID', HttpStatus.BAD_REQUEST);
      }

      const authUserId = req.user?.userId;
      if (!authUserId) {
        console.error('JWT token validation failed: User ID not found in token payload');
        throw new HttpException('Unauthorized: User ID not found in token', HttpStatus.UNAUTHORIZED);
      }

      const transaction = await this.transactionService.findOne(idNum);
      
      // Check if user has permission to view this transaction
      if (transaction.userId !== authUserId) {
        console.warn(`User ${authUserId} attempted to access transaction ${idNum}`);
        throw new HttpException('Forbidden: Cannot access other users\' transaction', HttpStatus.FORBIDDEN);
      }

      return transaction;
    } catch (error) {
      console.error('Error in getTransactionById:', error.message);
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // Existing stock history routes (unchanged, included for completeness)
  @Get('stock-history/all/:skip/:take')
  @ApiOperation({ summary: 'Get all stock history records with pagination' })
  @ApiParam({ name: 'skip', type: Number, description: 'Number of records to skip' })
  @ApiParam({ name: 'take', type: Number, description: 'Number of records to take' })
  @ApiResponse({ status: 200, description: 'Stock history retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async findAllStockHistory(
    @Param('skip') skip: string,
    @Param('take') take: string,
    @Request() req,
  ) {
    try {
      const skipNum = parseInt(skip, 10);
      const takeNum = parseInt(take, 10);
      if (isNaN(skipNum) || isNaN(takeNum) || skipNum < 0 || takeNum <= 0) {
        throw new HttpException('Invalid skip or take parameters', HttpStatus.BAD_REQUEST);
      }
      const authUserId = req.user?.userId;
      if (!authUserId) {
        console.error('JWT token validation failed: User ID not found in token payload');
        throw new HttpException('Unauthorized: User ID not found in token', HttpStatus.UNAUTHORIZED);
      }
      const stockHistory = await this.transactionService.findStockHistory(skipNum, takeNum, { userId: authUserId });
      const total = await this.transactionService.countStockHistory({ userId: authUserId });
      return { stockHistory, total };
    } catch (error) {
      console.error('Error in findAllStockHistory:', error.message);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('stock-history/by-user/:userId/:skip/:take')
  @ApiOperation({ summary: 'Get stock history by user ID' })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID who created the stock history' })
  @ApiParam({ name: 'skip', type: Number, description: 'Number of records to skip' })
  @ApiParam({ name: 'take', type: Number, description: 'Number of records to take' })
  @ApiResponse({ status: 200, description: 'Stock history retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async findStockHistoryByUser(
    @Param('userId') userId: string,
    @Param('skip') skip: string,
    @Param('take') take: string,
    @Request() req,
  ) {
    try {
      const userIdNum = parseInt(userId, 10);
      const skipNum = parseInt(skip, 10);
      const takeNum = parseInt(take, 10);
      if (isNaN(userIdNum) || isNaN(skipNum) || isNaN(takeNum) || skipNum < 0 || takeNum <= 0) {
        throw new HttpException('Invalid userId, skip, or take parameters', HttpStatus.BAD_REQUEST);
      }
      const authUserId = req.user?.userId;
      if (!authUserId) {
        console.error('JWT token validation failed: User ID not found in token payload');
        throw new HttpException('Unauthorized: User ID not found in token', HttpStatus.UNAUTHORIZED);
      }
      if (userIdNum !== authUserId) {
        console.warn(`User ${authUserId} attempted to access stock history for user ${userIdNum}`);
        throw new HttpException('Forbidden: Cannot access other users\' data', HttpStatus.FORBIDDEN);
      }
      const stockHistory = await this.transactionService.findStockHistory(skipNum, takeNum, { userId: userIdNum });
      const total = await this.transactionService.countStockHistory({ userId: userIdNum });
      return { stockHistory, total };
    } catch (error) {
      console.error('Error in findStockHistoryByUser:', error.message);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('stock-history/by-product/:productId/:skip/:take')
  @ApiOperation({ summary: 'Get stock history by product ID' })
  @ApiParam({ name: 'productId', type: Number, description: 'Product ID' })
  @ApiParam({ name: 'skip', type: Number, description: 'Number of records to skip' })
  @ApiParam({ name: 'take', type: Number, description: 'Number of records to take' })
  @ApiResponse({ status: 200, description: 'Stock history retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async findStockHistoryByProduct(
    @Param('productId') productId: string,
    @Param('skip') skip: string,
    @Param('take') take: string,
    @Request() req,
  ) {
    try {
      const productIdNum = parseInt(productId, 10);
      const skipNum = parseInt(skip, 10);
      const takeNum = parseInt(take, 10);
      if (isNaN(productIdNum) || isNaN(skipNum) || isNaN(takeNum) || skipNum < 0 || takeNum <= 0) {
        throw new HttpException('Invalid productId, skip, or take parameters', HttpStatus.BAD_REQUEST);
      }
      const authUserId = req.user?.userId;
      if (!authUserId) {
        console.error('JWT token validation failed: User ID not found in token payload');
        throw new HttpException('Unauthorized: User ID not found in token', HttpStatus.UNAUTHORIZED);
      }
      const stockHistory = await this.transactionService.findStockHistory(skipNum, takeNum, {
        productId: productIdNum,
        userId: authUserId,
      });
      const total = await this.transactionService.countStockHistory({ productId: productIdNum, userId: authUserId });
      return { stockHistory, total };
    } catch (error) {
      console.error('Error in findStockHistoryByProduct:', error.message);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('stock-history/by-branch/:branchId/:skip/:take')
  @ApiOperation({ summary: 'Get stock history by branch ID' })
  @ApiParam({ name: 'branchId', type: Number, description: 'Branch ID' })
  @ApiParam({ name: 'skip', type: Number, description: 'Number of records to skip' })
  @ApiParam({ name: 'take', type: Number, description: 'Number of records to take' })
  @ApiResponse({ status: 200, description: 'Stock history retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async findStockHistoryByBranch(
    @Param('branchId') branchId: string,
    @Param('skip') skip: string,
    @Param('take') take: string,
    @Request() req,
  ) {
    try {
      const branchIdNum = parseInt(branchId, 10);
      const skipNum = parseInt(skip, 10);
      const takeNum = parseInt(take, 10);
      if (isNaN(branchIdNum) || isNaN(skipNum) || isNaN(takeNum) || skipNum < 0 || takeNum <= 0) {
        throw new HttpException('Invalid branchId, skip, or take parameters', HttpStatus.BAD_REQUEST);
      }
      const authUserId = req.user?.userId;
      if (!authUserId) {
        console.error('JWT token validation failed: User ID not found in token payload');
        throw new HttpException('Unauthorized: User ID not found in token', HttpStatus.UNAUTHORIZED);
      }
      const stockHistory = await this.transactionService.findStockHistory(skipNum, takeNum, {
        branchId: branchIdNum,
        userId: authUserId,
      });
      const total = await this.transactionService.countStockHistory({ branchId: branchIdNum, userId: authUserId });
      return { stockHistory, total };
    } catch (error) {
      console.error('Error in findStockHistoryByBranch:', error.message);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('stock-history/by-type/:type/:skip/:take')
  @ApiOperation({ summary: 'Get stock history by type' })
  @ApiParam({ name: 'type', enum: StockHistoryType, description: 'Stock history type (INFLOW, OUTFLOW, RETURN, ADJUSTMENT)' })
  @ApiParam({ name: 'skip', type: Number, description: 'Number of records to skip' })
  @ApiParam({ name: 'take', type: Number, description: 'Number of records to take' })
  @ApiResponse({ status: 200, description: 'Stock history retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async findStockHistoryByType(
    @Param('type') type: StockHistoryType,
    @Param('skip') skip: string,
    @Param('take') take: string,
    @Request() req,
  ) {
    try {
      if (!Object.values(StockHistoryType).includes(type)) {
        throw new HttpException(`Invalid stock history type: ${type}`, HttpStatus.BAD_REQUEST);
      }
      const skipNum = parseInt(skip, 10);
      const takeNum = parseInt(take, 10);
      if (isNaN(skipNum) || isNaN(takeNum) || skipNum < 0 || takeNum <= 0) {
        throw new HttpException('Invalid skip or take parameters', HttpStatus.BAD_REQUEST);
      }
      const authUserId = req.user?.userId;
      if (!authUserId) {
        console.error('JWT token validation failed: User ID not found in token payload');
        throw new HttpException('Unauthorized: User ID not found in token', HttpStatus.UNAUTHORIZED);
      }
      const stockHistory = await this.transactionService.findStockHistory(skipNum, takeNum, {
        type,
        userId: authUserId,
      });
      const total = await this.transactionService.countStockHistory({ type, userId: authUserId });
      return { stockHistory, total };
    } catch (error) {
      console.error('Error in findStockHistoryByType:', error.message);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('stock-history/:id')
  @ApiOperation({ summary: 'Get stock history by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Stock history ID' })
  @ApiResponse({ status: 200, description: 'Stock history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Stock history not found' })
  async findStockHistoryById(@Param('id') id: string, @Request() req) {
    try {
      const idNum = parseInt(id, 10);
      if (isNaN(idNum)) {
        throw new HttpException('Invalid stock history ID', HttpStatus.BAD_REQUEST);
      }
      const authUserId = req.user?.userId;
      if (!authUserId) {
        console.error('JWT token validation failed: User ID not found in token payload');
        throw new HttpException('Unauthorized: User ID not found in token', HttpStatus.UNAUTHORIZED);
      }
      const stockHistory = await this.transactionService.findStockHistoryById(idNum);
      if (stockHistory.createdById !== authUserId) {
        console.warn(`User ${authUserId} attempted to access stock history ${idNum}`);
        throw new HttpException('Forbidden: Cannot access other users\' stock history', HttpStatus.FORBIDDEN);
      }
      return stockHistory;
    } catch (error) {
      console.error('Error in findStockHistoryById:', error.message);
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }
}