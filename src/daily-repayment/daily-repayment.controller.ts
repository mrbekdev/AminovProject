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

  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Query('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dailyRepaymentService.findByUser(
      parseInt(userId),
      branchId,
      startDate,
      endDate,
    );
  }

  @Get('cashier/:cashierId')
  findByCashier(
    @Param('cashierId') cashierId: string,
    @Query('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dailyRepaymentService.findByCashier(
      parseInt(cashierId),
      branchId,
      startDate,
      endDate,
    );
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
}
