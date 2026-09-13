import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TradeInProductService } from './trade-in-product.service';
import { CreateTradeInProductDto } from './dto/create-trade-in-product.dto';
import { ApproveTradeInProductDto } from './dto/approve-trade-in-product.dto';

@Controller('trade-in-products')
@UseGuards(JwtAuthGuard)
export class TradeInProductController {
  constructor(private readonly service: TradeInProductService) {}

  @Post()
  async create(
    @Body() dto: CreateTradeInProductDto,
    @CurrentUser() user: any,
  ) {
    return this.service.create(dto, user?.id);
  }

  @Get()
  async findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('pending-count')
  async getPendingCount(@Query('branchId') branchId?: string) {
    return this.service.getPendingCount(branchId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post(':id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveTradeInProductDto,
    @CurrentUser() user: any,
  ) {
    return this.service.approve(id, dto, user?.id);
  }

  @Post(':id/reject')
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.service.reject(id, reason, user?.id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateTradeInProductDto>,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user?.id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
