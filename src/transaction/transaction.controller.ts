import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  create(@Body() createTransactionDto: CreateTransactionDto, @CurrentUser() user: any) {
    // created-by va sold-by ni alohida beramiz: created-by = current user, sold-by = DTO yoki current user
    const dtoWithSoldBy = {
      ...createTransactionDto,
      soldByUserId: createTransactionDto.soldByUserId || user.id,
      userId: createTransactionDto.userId || user.id
    } as any;
    return this.transactionService.create(dtoWithSoldBy, user.id);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.transactionService.findAll(query);
  }

  @Get('filter-options')
  getFilterOptions(@Query() query: any) {
    return this.transactionService.getFilterOptions(query);
  }

  @Get('delivery')
  async findDeliveryOrders() {
    return this.transactionService.findByType('DELIVERY');
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: any
  ) {
    return this.transactionService.updateStatus(parseInt(id), body.status, user.id);
  }

  @Get('product/:productId')
  async findByProductId(
    @Param('productId') productId: string,
    @Query('month') month?: string
  ) {
    const parsedProductId = parseInt(productId);
    
    if (isNaN(parsedProductId) || parsedProductId <= 0) {
      return {
        transactions: [],
        statusCounts: { PENDING: 0, COMPLETED: 0, CANCELLED: 0, total: 0 },
        typeCounts: { SALE: 0, PURCHASE: 0, TRANSFER: 0, RETURN: 0, WRITE_OFF: 0, STOCK_ADJUSTMENT: 0 }
      };
    }
    
    const result = await this.transactionService.findByProductId(parsedProductId, month);
    return result;
  }

  @Get('statistics')
  getStatistics(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.transactionService.getStatistics(
      branchId ? parseInt(branchId) : undefined,
      startDate,
      endDate
    );
  }

  @Get('debts')
  getDebts(
    @Query('branchId') branchId?: string,
    @Query('customerId') customerId?: string
  ) {
    return this.transactionService.getDebts({
      branchId: branchId ? parseInt(branchId) : undefined,
      customerId: customerId ? parseInt(customerId) : undefined,
    });
  }

  @Get('debt-customers')
  getDebtCustomers(
    @Query('branchId') branchId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('hasOutstanding') hasOutstanding?: string,
    @Query('paymentStatus') paymentStatus?: string
  ) {
    return this.transactionService.getDebtCustomers({
      branchId: branchId ? parseInt(branchId) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      startDate,
      endDate,
      hasOutstanding: hasOutstanding ? hasOutstanding === 'true' : undefined,
      paymentStatus,
    });
  }

  @Get('pending-transfers')
  getPendingTransfers(@Query('branchId') branchId?: string) {
    return this.transactionService.getPendingTransfers(
      branchId ? parseInt(branchId) : undefined
    );
  }

  @Get('transfers/:branchId')
  getTransfersByBranch(@Param('branchId') branchId: string) {
    return this.transactionService.getTransfersByBranch(parseInt(branchId));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionService.findOne(+id);
  }

  @Get(':id/payment-schedules')
  getPaymentSchedules(@Param('id') id: string) {
    return this.transactionService.getPaymentSchedules(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto) {
    return this.transactionService.update(+id, updateTransactionDto);
  }

  @Patch(':id/payment-status')
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() body: { month: number; paid: boolean }
  ) {
    return this.transactionService.updatePaymentStatus(+id, body.month, body.paid);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.transactionService.remove(+id, user);
  }

  // Filiallar orasida o'tkazma
  @Post('transfer')
  createTransfer(@Body() transferData: any, @CurrentUser() user: any) {
    return this.transactionService.createTransfer({
      ...transferData,
      userId: transferData.userId || user.id,
      soldByUserId: transferData.soldByUserId || user.id // Frontend dan kelgan yoki current user
    });
  }

  @Post(':id/approve-transfer')
  approveTransfer(@Param('id') id: string, @CurrentUser() user: any) {
    return this.transactionService.approveTransfer(+id, user.id);
  }

  @Post(':id/reject-transfer')
  rejectTransfer(@Param('id') id: string) {
    return this.transactionService.rejectTransfer(+id);
  }
}