// product.controller.ts
import { Controller, Post, Body, Get, Param, Put, Delete, ParseIntPipe, Query, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assuming you have auth

@Controller('products')
@UseGuards(JwtAuthGuard) // Add auth if needed
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  findAll(
    @Query('branchId', ParseIntPipe) branchId?: number,
    @Query('search') search?: string,
    @Query('includeZeroQuantity') includeZeroQuantity: string = 'false',
  ) {
    return this.productService.findAll(branchId, search, includeZeroQuantity === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body('branchId', ParseIntPipe) branchId: number,
    @Body('categoryId', ParseIntPipe) categoryId: number,
    @Body('status') status: string,
  ) {
    return this.productService.uploadExcel(file, branchId, categoryId, status);
  }

  // product.controller.ts ga qo'shiladigan funksiya
@Delete('bulk')
bulkRemove(@Body() body: { ids: number[] }) {
  return this.productService.removeMany(body.ids);
}
}