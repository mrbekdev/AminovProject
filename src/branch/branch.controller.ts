import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  HttpException, HttpStatus, UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Branches')
@Controller('branches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BranchController {
  constructor(private readonly branchService: BranchService) { }

  @Post()
  @ApiOperation({ summary: 'Yangi filial yaratish' })
  @ApiResponse({ status: 201, description: 'Filial yaratildi' })
  @ApiResponse({ status: 400, description: 'Xato so\'rov' })
  async create(@Body() createBranchDto: CreateBranchDto) {
    try {
      return await this.branchService.create(createBranchDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Filial maʼlumotini olish' })
  @ApiResponse({ status: 200, description: 'Filial topildi' })
  @ApiResponse({ status: 404, description: 'Topilmadi' })
  async findOne(@Param('id') id: string) {
    const branch = await this.branchService.findOne(+id);
    if (!branch) throw new HttpException('Branch not found', HttpStatus.NOT_FOUND);
    return branch;
  }

  @Get()
  @ApiOperation({ summary: 'Barcha filiallarni olish' })
  async findAll() {
    return this.branchService.findAll();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Filialni tahrirlash' })
  async update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
    try {
      return await this.branchService.update(+id, updateBranchDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Filialni o\'chirish' })
  async remove(@Param('id') id: string) {
    try {
      return await this.branchService.remove(+id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}