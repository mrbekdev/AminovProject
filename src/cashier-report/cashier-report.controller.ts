import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CashierReportService } from './cashier-report.service';
import { CreateCashierReportDto } from './dto/create-cashier-report.dto';
import { UpdateCashierReportDto } from './dto/update-cashier-report.dto';

@Controller('cashier-reports')
export class CashierReportController {
  constructor(private readonly cashierReportService: CashierReportService) {}

  @Post()
  create(@Body() createCashierReportDto: CreateCashierReportDto) {
    return this.cashierReportService.create(createCashierReportDto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.cashierReportService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cashierReportService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCashierReportDto: UpdateCashierReportDto) {
    return this.cashierReportService.update(+id, updateCashierReportDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cashierReportService.remove(+id);
  }

  @Get('cashier/:cashierId')
  getCashierReport(
    @Param('cashierId') cashierId: string,
    @Query('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.cashierReportService.getCashierReport(
      +cashierId,
      +branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
