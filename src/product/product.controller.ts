// product.controller.ts
import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  Put, 
  Delete, 
  ParseIntPipe, 
  Query, 
  UseInterceptors, 
  UploadedFile, 
  UseGuards 
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
    @Query('includeZeroQuantity') includeZeroQuantity: string = 'false',
  ) {
    const parsedBranchId = branchId ? parseInt(branchId) : undefined;
    return this.productService.findAll(parsedBranchId, search, includeZeroQuantity === 'true');
  }

  @Get('defective')
  getDefectiveProducts(@Query('branchId') branchId?: string) {
    const parsedBranchId = branchId ? parseInt(branchId) : undefined;
    return this.productService.getDefectiveProducts(parsedBranchId);
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productService.findByBarcode(barcode);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  // Mahsulotni to'liq defective qilish
  @Put(':id/mark-defective')
  markAsDefective(
    @Param('id', ParseIntPipe) id: number,
    @Body('description') description: string,
  ) {
    return this.productService.markAsDefective(id, description);
  }

  // Mahsulotdan ma'lum miqdorini defective qilish
  @Put(':id/partial-defective')
  markPartialDefective(
    @Param('id', ParseIntPipe) id: number,
    @Body('defectiveCount', ParseIntPipe) defectiveCount: number,
    @Body('description') description: string,
  ) {
    return this.productService.markPartialDefective(id, defectiveCount, description);
  }

  // Defective mahsulotni qaytarish
  @Put(':id/restore-defective')
  restoreDefectiveProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body('restoreCount', ParseIntPipe) restoreCount: number
  ) {
    return this.productService.restoreDefectiveProduct(id, restoreCount);
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

  @Delete('bulk')
  bulkRemove(@Body() body: { ids: number[] }) {
    return this.productService.removeMany(body.ids);
  }
}