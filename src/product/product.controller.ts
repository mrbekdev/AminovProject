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
  BadRequestException
} from '@nestjs/common';
import { Request } from 'express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BulkDeleteDto } from './dto/bulk-delete.dto';

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
    return this.productService.update(id, updateProductDto, req.user.id);
  }

// Mahsulotni to'liq defective qilish
@Put(':id/mark-defective')
markAsDefective(
  @Req() req: AuthRequest,
  @Param('id', ParseIntPipe) id: number,
  @Body() body: { description: string }
) {
  if (!body.description) {
    throw new BadRequestException('Description is required');
  }
  return this.productService.markAsDefective(id, body.description, req.user.id);
}

// Mahsulotdan ma'lum miqdorini defective qilish
@Put(':id/partial-defective')
markPartialDefective(
  @Req() req: AuthRequest,
  @Param('id', ParseIntPipe) id: number,
  @Body() body: { defectiveCount: number; description: string }
) {
  if (!body.description) {
    throw new BadRequestException('Description is required');
  }
  if (!body.defectiveCount || body.defectiveCount <= 0) {
    throw new BadRequestException('Valid defectiveCount is required');
  }
  return this.productService.markPartialDefective(id, body.defectiveCount, body.description, req.user.id);
}

// Defective mahsulotni qaytarish
@Put(':id/restore-defective')
restoreDefectiveProduct(
  @Req() req: AuthRequest,
  @Param('id', ParseIntPipe) id: number,
  @Body() body: { restoreCount: number }
) {
  if (!body.restoreCount || body.restoreCount <= 0) {
    throw new BadRequestException('Valid restoreCount is required');
  }
  return this.productService.restoreDefectiveProduct(id, body.restoreCount, req.user.id);
}

  // Bulk defective
  @Post('bulk-defective')
  bulkMarkDefective(@Req() req: AuthRequest, @Body() body: { ids: number[]; description: string }) {
    return this.productService.bulkMarkDefective(body.ids, body.description, req.user.id);
  }

  // Bulk restore defective
  @Post('bulk-restore-defective')
  bulkRestoreDefective(@Req() req: AuthRequest, @Body() body: { ids: number[] }) {
    return this.productService.bulkRestoreDefective(body.ids, req.user.id);
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
bulkRemove(@Body() body: BulkDeleteDto) {
  return this.productService.removeMany(body.ids);
}

}