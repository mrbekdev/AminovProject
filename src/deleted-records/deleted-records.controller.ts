import { Controller, Get, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeletedRecordsService } from './deleted-records.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Deleted Records')
@Controller('deleted-records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeletedRecordsController {
  constructor(private readonly deletedRecordsService: DeletedRecordsService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha o\'chirilgan yozuvlar ro\'yxati' })
  findAll(
    @CurrentUser() user: any,
    @Query('entityType') entityType?: string,
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.deletedRecordsService.findAll({
      entityType,
      branchId: branchId ? Number(branchId) : undefined,
      search,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta o\'chirilgan yozuvning to\'liq ma\'lumoti' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.deletedRecordsService.findOne(id);
  }
}
