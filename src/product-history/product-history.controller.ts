import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ProductHistoryService } from './product-history.service';

@Controller('product-history')
export class ProductHistoryController {
  constructor(private readonly historyService: ProductHistoryService) {}

  @Get('product/:productId')
  async getByProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 20;
    return this.historyService.findByProduct(productId, p, l);
  }
}
