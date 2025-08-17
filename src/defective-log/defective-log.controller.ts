import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
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
  findAll() {
    return this.defectiveLogService.findAll();
  }

  @Get('defective-products')
  getDefectiveProducts() {
    return this.defectiveLogService.getDefectiveProducts();
  }

  @Get('fixed-products')
  getFixedProducts() {
    return this.defectiveLogService.getFixedProducts();
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
  markAsFixed(@Param('productId') productId: string, @Request() req) {
    return this.defectiveLogService.markAsFixed(+productId, req.user?.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.defectiveLogService.remove(+id);
  }
}
