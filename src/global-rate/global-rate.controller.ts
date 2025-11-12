import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { GlobalRateService } from './global-rate.service';

@Controller('global-rate')
export class GlobalRateController {
  constructor(private readonly service: GlobalRateService) {}

  @Get('current')
  getCurrent() {
    return this.service.getCurrent();
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() body: { value: number }) {
    return this.service.create(Number(body?.value));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { value: number }) {
    return this.service.update(Number(id), Number(body?.value));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
