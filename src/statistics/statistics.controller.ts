import { Controller, Get, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StatisticsService } from './statistics.service';

@ApiTags('Statistics')
@Controller('statistics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @ApiOperation({ summary: 'Dashboard/statistics metrics and aggregations' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'period', required: false, type: String, description: 'today, yesterday, week, month, year' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'customerSortBy', required: false, type: String })
  async getDashboardStats(
    @Query('branchId') branchId?: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('customerSortBy') customerSortBy?: string,
  ) {
    const parsedBranchId = branchId ? parseInt(branchId, 10) : undefined;
    return this.statisticsService.getDashboardStats(
      parsedBranchId,
      period,
      startDate,
      endDate,
      customerSortBy,
    );
  }

  @Get('profit-expenses')
  @ApiOperation({ summary: 'Calculate profit and expenses exactly like Reports.jsx' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getProfitAndExpenses(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parsedBranchId = branchId ? parseInt(branchId, 10) : undefined;
    return this.statisticsService.getProfitAndExpenses(
      parsedBranchId,
      startDate,
      endDate,
    );
  }

  @Get('handover-total')
  @ApiOperation({ summary: 'Calculate cashier handover totals' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getHandoverTotal(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parsedBranchId = branchId ? parseInt(branchId, 10) : undefined;
    return this.statisticsService.getHandoverTotal(
      parsedBranchId,
      startDate,
      endDate,
    );
  }

  @Get('warehouse')
  @ApiOperation({ summary: 'Calculate warehouse statistics (inflows, outflows, transfers)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getWarehouseStats(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parsedBranchId = branchId ? parseInt(branchId, 10) : undefined;
    return this.statisticsService.getWarehouseStats(
      parsedBranchId,
      startDate,
      endDate,
    );
  }

  @Get('auditor/:id')
  @ApiOperation({ summary: 'Get stats for a specific auditor' })
  async getAuditorStats(
    @Param('id') id: string,
  ) {
    return this.statisticsService.getAuditorStats(parseInt(id, 10));
  }

  @Get('customer-transactions/:id')
  @ApiOperation({ summary: 'Get transactions for a specific customer with parsed bonus details' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getCustomerTransactions(
    @Param('id') id: string,
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parsedBranchId = branchId ? parseInt(branchId, 10) : undefined;
    return this.statisticsService.getCustomerTransactions(
      parseInt(id, 10),
      parsedBranchId,
      startDate,
      endDate,
    );
  }

  @Get('warehouse-detailed')
  @ApiOperation({ summary: 'Calculate detailed warehouse statistics across 3 key sectors' })
  @ApiQuery({ name: 'branchId', required: true, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getWarehouseDetailedStats(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parsedBranchId = branchId ? parseInt(branchId, 10) : undefined;
    return this.statisticsService.getWarehouseDetailedStats(
      parsedBranchId,
      startDate,
      endDate,
    );
  }
}

