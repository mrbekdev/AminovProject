// transaction.controller.ts
import { Controller, Get, Param, Request, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { StockHistoryType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Stock History')
@Controller('transactions/stock-history')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('all/:skip/:take')
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
      const authUserId = req.user?.id;
      if (!authUserId) {
        throw new HttpException('Unauthorized: User ID not found', HttpStatus.UNAUTHORIZED);
      }
      const stockHistory = await this.transactionService.findStockHistory(skipNum, takeNum, { userId: authUserId });
      const total = await this.transactionService.countStockHistory({ userId: authUserId });
      return { stockHistory, total };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('by-user/:userId/:skip/:take')
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
      const authUserId = req.user?.id;
      if (!authUserId) {
        throw new HttpException('Unauthorized: User ID not found', HttpStatus.UNAUTHORIZED);
      }
      const stockHistory = await this.transactionService.findStockHistory(skipNum, takeNum, { userId: userIdNum });
      const total = await this.transactionService.countStockHistory({ userId: userIdNum });
      return { stockHistory, total };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('by-product/:productId/:skip/:take')
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
      const authUserId = req.user?.id;
      if (!authUserId) {
        throw new HttpException('Unauthorized: User ID not found', HttpStatus.UNAUTHORIZED);
      }
      const stockHistory = await this.transactionService.findStockHistory(skipNum, takeNum, {
        productId: productIdNum,
        userId: authUserId,
      });
      const total = await this.transactionService.countStockHistory({ productId: productIdNum, userId: authUserId });
      return { stockHistory, total };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('by-branch/:branchId/:skip/:take')
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
      const authUserId = req.user?.id;
      if (!authUserId) {
        throw new HttpException('Unauthorized: User ID not found', HttpStatus.UNAUTHORIZED);
      }
      const stockHistory = await this.transactionService.findStockHistory(skipNum, takeNum, {
        branchId: branchIdNum,
        userId: authUserId,
      });
      const total = await this.transactionService.countStockHistory({ branchId: branchIdNum, userId: authUserId });
      return { stockHistory, total };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('by-type/:type/:skip/:take')
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
      const authUserId = req.user?.id;
      if (!authUserId) {
        throw new HttpException('Unauthorized: User ID not found', HttpStatus.UNAUTHORIZED);
      }
      const stockHistory = await this.transactionService.findStockHistory(skipNum, takeNum, {
        type,
        userId: authUserId,
      });
      const total = await this.transactionService.countStockHistory({ type, userId: authUserId });
      return { stockHistory, total };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stock history by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Stock history ID' })
  @ApiResponse({ status: 200, description: 'Stock history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Stock history not found' })
  async findStockHistoryById(@Param('id') id: string) {
    try {
      const idNum = parseInt(id, 10);
      if (isNaN(idNum)) {
        throw new HttpException('Invalid stock history ID', HttpStatus.BAD_REQUEST);
      }
      return await this.transactionService.findStockHistoryById(idNum);
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }
}