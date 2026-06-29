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
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let start = new Date('2000-01-01T00:00:00.000Z');
    if (startDate) {
      start = new Date(startDate);
      start.setUTCHours(start.getUTCHours() - 5);
    }
    let end = new Date();
    if (endDate) {
      end = new Date(endDate);
      end.setUTCDate(end.getUTCDate() + 1);
      end.setUTCHours(end.getUTCHours() - 5);
      end.setTime(end.getTime() - 1);
    }

    const parsedBranchId = branchId ? parseInt(branchId, 10) : NaN;

    return this.cashierReportService.getCashierReport(
      +cashierId,
      parsedBranchId,
      start,
      end,
    );
  }
}
