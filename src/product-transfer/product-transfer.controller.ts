import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Put } from '@nestjs/common';
import { ProductTransferService } from './product-transfer.service';
import { CreateProductTransferDto, UpdateProductTransferDto } from './dto/create-product-transfer.dto';

@Controller('product-transfers')
export class ProductTransferController {
  constructor(private readonly productTransferService: ProductTransferService) {}

  @Post()
  create(@Body() createProductTransferDto: CreateProductTransferDto) {
    return this.productTransferService.create(createProductTransferDto);
  }

  @Get()
  findAll() {
    return this.productTransferService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productTransferService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateProductTransferDto: UpdateProductTransferDto) {
    return this.productTransferService.update(+id, updateProductTransferDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productTransferService.remove(+id);
  }

  @Get('report/:branchId')
  getStockReport(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.productTransferService.getStockReport(+branchId, new Date(startDate), new Date(endDate));
  }
}