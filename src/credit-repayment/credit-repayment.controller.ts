import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CreditRepaymentService } from './credit-repayment.service';
import { CreateCreditRepaymentDto } from './dto/create-credit-repayment.dto';
import { UpdateCreditRepaymentDto } from './dto/update-credit-repayment.dto';

@Controller('credit-repayments')
export class CreditRepaymentController {
  constructor(private readonly creditRepaymentService: CreditRepaymentService) {}

  @Post()
  create(@Body() createCreditRepaymentDto: CreateCreditRepaymentDto) {
    return this.creditRepaymentService.create(createCreditRepaymentDto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.creditRepaymentService.findAll(query);
  }

  @Get('cashier/:cashierId')
  findByCashier(
    @Param('cashierId') cashierId: string,
    @Query('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.creditRepaymentService.findByCashier(
      parseInt(cashierId),
      branchId ? parseInt(branchId) : undefined,
      startDate,
      endDate,
    );
  }

  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Query('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.creditRepaymentService.findByUser(
      parseInt(userId),
      branchId ? parseInt(branchId) : undefined,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.creditRepaymentService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCreditRepaymentDto: UpdateCreditRepaymentDto) {
    return this.creditRepaymentService.update(+id, updateCreditRepaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.creditRepaymentService.remove(+id);
  }
}
