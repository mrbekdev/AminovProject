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
  Req, 
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { Request } from 'express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { id: number; role: string; userId: number };
}

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  create(@Req() req: AuthRequest, @Body() createProductDto: CreateProductDto) {
    if (req.user.role === 'REVIZOR') {
      throw new ForbiddenException('Revizor mahsulot yaratish huquqiga ega emas.');
    }
    return this.productService.create(createProductDto, req.user.id || req.user.userId);
  }

  @Post('check-transfer-matches')
  checkTransferMatches(@Body() body: { toBranchId: number; items: any[] }) {
    if (!body.toBranchId || !body.items || !Array.isArray(body.items)) {
      throw new BadRequestException('Invalid payload. toBranchId and items array are required.');
    }
    return this.productService.checkTransferMatches(body.toBranchId, body.items);
  }

  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
    @Query('includeZeroQuantity') includeZeroQuantity: string = 'false',
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('bonus') bonus?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedBranchId = branchId ? parseInt(branchId) : undefined;
    const parsedCategoryId = categoryId ? parseInt(categoryId) : undefined;
    const parsedBonus = bonus ? parseFloat(bonus) : undefined;
    const parsedPage = page ? parseInt(page) : undefined;
    const parsedLimit = limit ? parseInt(limit) : undefined;

    return this.productService.findAll(
      parsedBranchId,
      search,
      includeZeroQuantity === 'true',
      parsedCategoryId,
      status,
      parsedBonus,
      parsedPage,
      parsedLimit,
    );
  }

  @Get('defective')
  getDefectiveProducts(@Query('branchId') branchId?: string) {
    const parsedBranchId = branchId ? parseInt(branchId) : undefined;
    return this.productService.getDefectiveProducts(parsedBranchId);
  }

  @Get('fixed')
  getFixedProducts(@Query('branchId') branchId?: string) {
    const parsedBranchId = branchId ? parseInt(branchId) : undefined;
    return this.productService.getFixedProducts(parsedBranchId);
  }


  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  @Put(':id')
  update(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto) {
    if (req.user.role === 'REVIZOR') {
      throw new ForbiddenException('Revizor mahsulotlarni tahrirlash huquqiga ega emas.');
    }
    return this.productService.update(id, updateProductDto, req.user.id || req.user.userId);
  }

  // Mahsulotni to'liq defective qilish
  @Put(':id/mark-defective')
  markAsDefective(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { description: string }
  ) {
    if (req.user.role === 'REVIZOR') {
      throw new ForbiddenException('Revizor mahsulotlarni o\'zgartirish huquqiga ega emas.');
    }
    if (!body.description) {
      throw new BadRequestException('Description is required');
    }
    return this.productService.markAsDefective(id, body.description, req.user.id || req.user.userId);
  }

  // Mahsulotdan ma'lum miqdorini defective qilish
  @Put(':id/partial-defective')
  markPartialDefective(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { defectiveCount: number; description: string }
  ) {
    if (req.user.role === 'REVIZOR') {
      throw new ForbiddenException('Revizor mahsulotlarni o\'zgartirish huquqiga ega emas.');
    }
    if (!body.description) {
      throw new BadRequestException('Description is required');
    }
    if (!body.defectiveCount || body.defectiveCount <= 0) {
      throw new BadRequestException('Valid defectiveCount is required');
    }
    return this.productService.markPartialDefective(id, body.defectiveCount, body.description, req.user.id || req.user.userId);
  }

  // Defective mahsulotni qaytarish
  @Put(':id/restore-defective')
  restoreDefectiveProduct(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { restoreCount: number }
  ) {
    if (req.user.role === 'REVIZOR') {
      throw new ForbiddenException('Revizor mahsulotlarni o\'zgartirish huquqiga ega emas.');
    }
    if (!body.restoreCount || body.restoreCount <= 0) {
      throw new BadRequestException('Valid restoreCount is required');
    }
    return this.productService.restoreDefectiveProduct(id, body.restoreCount, req.user.id || req.user.userId);
  }

  // Bulk defective
  @Post('bulk-defective')
  bulkMarkDefective(@Req() req: AuthRequest, @Body() body: { ids: number[]; description: string }) {
    if (req.user.role === 'REVIZOR') {
      throw new ForbiddenException('Revizor mahsulotlarni o\'zgartirish huquqiga ega emas.');
    }
    return this.productService.bulkMarkDefective(body.ids, body.description, req.user.id || req.user.userId);
  }

  // Bulk restore defective
  @Post('bulk-restore-defective')
  bulkRestoreDefective(@Req() req: AuthRequest, @Body() body: { ids: number[] }) {
    if (req.user.role === 'REVIZOR') {
      throw new ForbiddenException('Revizor mahsulotlarni o\'zgartirish huquqiga ega emas.');
    }
    return this.productService.bulkRestoreDefective(body.ids, req.user.id || req.user.userId);
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    if (req.user.role === 'REVIZOR') {
      throw new ForbiddenException('Revizor mahsulotlarni o\'chirish huquqiga ega emas.');
    }
    return this.productService.remove(id, req.user.id || req.user.userId);
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
    if (req.user.role === 'REVIZOR') {
      throw new ForbiddenException('Revizor mahsulotlarni yuklash huquqiga ega emas.');
    }
    return this.productService.uploadExcel(file, branchId, categoryId, status, req.user.id || req.user.userId);
  }

  @Delete('bulk')
  bulkRemove(@Req() req: AuthRequest, @Body() body: { ids: number[] }) {
    if (req.user.role === 'REVIZOR') {
      throw new ForbiddenException('Revizor mahsulotlarni o\'chirish huquqiga ega emas.');
    }
    return this.productService.removeMany(body.ids);
  }
}