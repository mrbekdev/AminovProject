import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { DailyExpenseService } from './daily-expense.service';
import { CreateDailyExpenseDto } from './dto/create-daily-expense.dto';
import { UpdateDailyExpenseDto } from './dto/update-daily-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('daily-expenses')
export class DailyExpenseController {
  constructor(private readonly service: DailyExpenseService) {}

  @Post()
  create(@Body() dto: CreateDailyExpenseDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDailyExpenseDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
