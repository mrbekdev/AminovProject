import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { DefectiveLogService } from './defective-log.service';
import { CreateDefectiveLogDto } from './dto/create-defective-log.dto';
import { UpdateDefectiveLogDto } from './dto/update-defective-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('defective-logs')
@UseGuards(JwtAuthGuard)
export class DefectiveLogController {
  constructor(private readonly defectiveLogService: DefectiveLogService) {}

  @Post()
  create(@Body() createDefectiveLogDto: CreateDefectiveLogDto, @Request() req) {
    return this.defectiveLogService.create({
      ...createDefectiveLogDto,
      userId: req.user?.id
    });
  }

  @Get()
  findAll(@Query() query: any) {
    return this.defectiveLogService.findAll(query);
  }

  @Get('defective-products')
  getDefectiveProducts(@Query('branchId') branchId?: string) {
    return this.defectiveLogService.getDefectiveProducts(branchId ? +branchId : undefined);
  }

  @Get('fixed-products')
  getFixedProducts(@Query('branchId') branchId?: string) {
    return this.defectiveLogService.getFixedProducts(branchId ? +branchId : undefined);
  }

  @Get('returned-products')
  getReturnedProducts(@Query('branchId') branchId?: string) {
    return this.defectiveLogService.getReturnedProducts(branchId ? +branchId : undefined);
  }

  @Get('exchanged-products')
  getExchangedProducts(@Query('branchId') branchId?: string) {
    return this.defectiveLogService.getExchangedProducts(branchId ? +branchId : undefined);
  }

  @Get('statistics')
  getStatistics(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.defectiveLogService.getStatistics(
      branchId ? +branchId : undefined,
      startDate,
      endDate
    );
  }

  // Kassir bo'yicha qaytarishlar (plus/minus) va ro'yxat
  @Get('cashier/:id')
  async getByCashier(
    @Param('id') id: string,
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('actionType') actionType?: string,
  ) {
    return this.defectiveLogService.getByCashier(+id, {
      branchId,
      startDate,
      endDate,
      actionType,
    });
  }

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.defectiveLogService.findByProduct(+productId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.defectiveLogService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDefectiveLogDto: UpdateDefectiveLogDto) {
    return this.defectiveLogService.update(+id, updateDefectiveLogDto);
  }

  @Post('mark-as-fixed/:productId')
  markAsFixed(
    @Param('productId') productId: string,
    @Body() body: { quantity: number; branchId?: number },
    @Request() req
  ) {
    return this.defectiveLogService.markAsFixed(
      +productId,
      body.quantity,
      req.user?.id,
      body.branchId
    );
  }

  @Post('return/:productId')
  returnProduct(
    @Param('productId') productId: string,
    @Body() body: { quantity: number; description: string; branchId?: number },
    @Request() req
  ) {
    return this.defectiveLogService.returnProduct(
      +productId,
      body.quantity,
      body.description,
      req.user?.id,
      body.branchId
    );
  }

  @Post('exchange/:productId')
  exchangeProduct(
    @Param('productId') productId: string,
    @Body() body: { quantity: number; description: string; branchId?: number },
    @Request() req
  ) {
    return this.defectiveLogService.exchangeProduct(
      +productId,
      body.quantity,
      body.description,
      req.user?.id,
      body.branchId
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.defectiveLogService.remove(+id);
  }
}
