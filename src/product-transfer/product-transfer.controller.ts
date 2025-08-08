import { Controller, Get, Post, Body, Put, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productTransferService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductTransferDto: UpdateProductTransferDto,
  ) {
    return this.productTransferService.update(id, updateProductTransferDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productTransferService.remove(id);
  }

  @Get('report/:branchId')
  getStockReport(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.productTransferService.getStockReport(
      branchId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}