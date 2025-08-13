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
  UseGuards, 
  Req 
} from '@nestjs/common';
import { Request } from 'express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { id: number };
}

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  create(@Req() req: AuthRequest, @Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto, req.user.id);
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

  // product.controller.ts
@Get('fixed')
getFixedProducts(@Query('branchId') branchId?: string) {
  const parsedBranchId = branchId ? parseInt(branchId) : undefined;
  return this.productService.getFixedProducts(parsedBranchId);
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
  update(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto, req.user.id);
  }

  // Mahsulotni to'liq defective qilish
  @Put(':id/mark-defective')
  markAsDefective(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('description') description: string,
  ) {
    return this.productService.markAsDefective(id, description, req.user.id);
  }

  // Mahsulotdan ma'lum miqdorini defective qilish
  @Put(':id/partial-defective')
  markPartialDefective(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('defectiveCount', ParseIntPipe) defectiveCount: number,
    @Body('description') description: string,
  ) {
    return this.productService.markPartialDefective(id, defectiveCount, description, req.user.id);
  }

  // Defective mahsulotni qaytarish
  @Put(':id/restore-defective')
  restoreDefectiveProduct(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('restoreCount', ParseIntPipe) restoreCount: number
  ) {
    return this.productService.restoreDefectiveProduct(id, restoreCount, req.user.id);
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id, req.user.id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadExcel(
    @Req() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('branchId', ParseIntPipe) branchId: number,
    @Body('categoryId', ParseIntPipe) categoryId: number,
    @Body('status') status: string,
  ) {
    return this.productService.uploadExcel(file, branchId, categoryId, status, req.user.id);
  }

  @Delete('bulk')
  bulkRemove(@Req() req: AuthRequest, @Body() body: { ids: number[] }) {
    return this.productService.removeMany(body.ids, req.user.id);
  }
}