import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { DailyRepaymentService } from './daily-repayment.service';
import { CreateDailyRepaymentDto } from './dto/create-daily-repayment.dto';
import { UpdateDailyRepaymentDto } from './dto/update-daily-repayment.dto';

@Controller('daily-repayments')
export class DailyRepaymentController {
  constructor(private readonly dailyRepaymentService: DailyRepaymentService) {}

  @Post()
  create(@Body() createDailyRepaymentDto: CreateDailyRepaymentDto) {
    return this.dailyRepaymentService.create(createDailyRepaymentDto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.dailyRepaymentService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dailyRepaymentService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDailyRepaymentDto: UpdateDailyRepaymentDto) {
    return this.dailyRepaymentService.update(+id, updateDailyRepaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dailyRepaymentService.remove(+id);
  }

  @Get('cashier/:cashierId')
  getCashierDailyRepayments(
    @Param('cashierId') cashierId: string,
    @Query('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dailyRepaymentService.getCashierDailyRepayments(
      +cashierId,
      +branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
