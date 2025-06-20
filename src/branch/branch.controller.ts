import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  async create(@Body() createBranchDto: CreateBranchDto) {
    try {
      return await this.branchService.create(createBranchDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const branch = await this.branchService.findOne(+id);
    if (!branch) throw new HttpException('Branch not found', HttpStatus.NOT_FOUND);
    return branch;
  }

  @Get()
  async findAll(@Query('skip') skip = '0', @Query('take') take = '10') {
    return this.branchService.findAll(+skip, +take);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
    try {
      return await this.branchService.update(+id, updateBranchDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.branchService.remove(+id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}