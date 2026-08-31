import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StoreService } from './store.service';

@ApiTags('Store')
@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('list')
  @ApiOperation({ summary: 'Get list of all stores' })
  async getList() {
    return this.storeService.findAll();
  }

  @Get()
  @ApiOperation({ summary: 'Get default or first store settings' })
  async getStore() {
    const stores = await this.storeService.findAll();
    return stores.length > 0 ? stores[0] : null;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get store by ID' })
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.storeService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new store' })
  async create(@Body() body: any) {
    return this.storeService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update store' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.storeService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete store' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.storeService.remove(id);
  }
}
