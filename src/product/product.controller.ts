import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';


@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi mahsulot yaratish' })
  @ApiResponse({ status: 201, description: 'Mahsulot yaratildi' })
  @ApiResponse({ status: 400, description: "Xato so'rov" })
  async create(@Body() createProductDto: CreateProductDto) {
    try {
      return await this.productService.create(createProductDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('upload-excel')
  @ApiOperation({ summary: 'Excel fayl orqali mahsulotlarni yuklash' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Mahsulotlar muvaffaqiyatli yuklandi' })
  @ApiResponse({ status: 400, description: "Xato so'rov" })
  @UseInterceptors(FileInterceptor('file'))
  async uploadExcel(@UploadedFile() file: Express.Multer.File) {
    try {
      return await this.productService.uploadExcel(file);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: "Mahsulot ma'lumotini olish" })
  @ApiResponse({ status: 200, description: 'Mahsulot topildi' })
  @ApiResponse({ status: 404, description: 'Topilmadi' })
  async findOne(@Param('id') id: string) {
    try {
      return await this.productService.findOne(+id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: "Mahsulotni barcode orqali olish" })
  @ApiResponse({ status: 200, description: 'Mahsulot topildi' })
  @ApiResponse({ status: 404, description: 'Topilmadi' })
  async findByBarcode(@Param('barcode') barcode: string) {
    try {
      return await this.productService.findByBarcode(barcode);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Barcha mahsulotlarni olish' })
  @ApiQuery({ name: 'branchId', required: false })
  async findAll(@Query('branchId') branchId?: string) {
    return this.productService.findAll(branchId ? +branchId : undefined);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mahsulotni tahrirlash' })
  @ApiResponse({ status: 200, description: 'Mahsulot tahrirlandi' })
  @ApiResponse({ status: 400, description: 'Xato so\'rov' })
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto, @Body ()userId: string) {
    try {
      return await this.productService.update(+id, updateProductDto, +userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: "Mahsulotni o'chirish" })
  @ApiResponse({ status: 200, description: 'Mahsulot o\'chirildi' })
  @ApiResponse({ status: 400, description: 'Xato so\'rov' })
  async remove(@Param('id') id: string) {
    try {
      return await this.productService.remove(+id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}