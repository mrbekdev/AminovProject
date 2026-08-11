import { Controller, Get, Post, Put, Param, Body, Query, Req } from '@nestjs/common';
import { DebtCashierReportService } from './debt-cashier-report.service';
import { CreateDebtCashierReportDto } from './dto/create-debt-cashier-report.dto';
import { ApproveDebtCashierReportDto } from './dto/approve-debt-cashier-report.dto';

@Controller('debt-cashier-reports')
export class DebtCashierReportController {
  constructor(private readonly reportService: DebtCashierReportService) {}

  @Post()
  async submitReport(@Req() req: any, @Body() dto: CreateDebtCashierReportDto) {
    const userId = req.user?.id || req.user?.sub || 1;
    const userBranchId = req.user?.branchId || null;
    return await this.reportService.createOrUpdateReport(userId, userBranchId, dto);
  }

  @Get('today')
  async getTodayReport(@Req() req: any, @Query('cashierId') cashierId?: string) {
    const userId = cashierId ? parseInt(cashierId, 10) : (req.user?.id || req.user?.sub || 1);
    return await this.reportService.getTodayReport(userId);
  }

  @Get()
  async getAllReports(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
    @Query('cashierId') cashierId?: string,
  ) {
    return await this.reportService.getAllReports(
      startDate,
      endDate,
      branchId ? parseInt(branchId, 10) : undefined,
      cashierId ? parseInt(cashierId, 10) : undefined,
    );
  }

  @Put(':id/approve')
  async approveReport(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: ApproveDebtCashierReportDto,
  ) {
    const approverId = req.user?.id || req.user?.sub || 1;
    return await this.reportService.approveReport(parseInt(id, 10), approverId, dto);
  }
}
