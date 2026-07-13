import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IncomingStockService } from './incoming-stock.service';
import { CreateIncomingStockReportDto } from './dto/create-report.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class IncomingStockController {
  constructor(private readonly service: IncomingStockService) {}

  // ─── Excel File Validation & Preview ───────────────────────────────────────
  @Post('incoming-stock-reports/validate')
  @UseInterceptors(FileInterceptor('file'))
  async validate(
    @UploadedFile() file: Express.Multer.File,
    @Body('branchId') branchIdRaw?: string,
    @Query('branchId') branchIdQuery?: string
  ) {
    const rawId = branchIdRaw || branchIdQuery;
    if (!rawId) {
      throw new BadRequestException('Filial ID (branchId) kiritilishi shart.');
    }
    const branchId = parseInt(rawId);
    if (isNaN(branchId)) {
      throw new BadRequestException('Filial ID raqam bo\'lishi shart.');
    }
    return this.service.validateExcel(file, branchId);
  }

  // ─── Create Report ──────────────────────────────────────────────────────────
  @Post('incoming-stock-reports')
  async create(
    @Body() dto: CreateIncomingStockReportDto,
    @CurrentUser() user: any
  ) {
    const userId = user.userId || user.id || user.sub;
    return this.service.createReport(dto, userId);
  }

  // ─── List Reports ──────────────────────────────────────────────────────────
  @Get('incoming-stock-reports')
  async findAll(@Query() query: any, @CurrentUser() user: any) {
    return this.service.findAll(query, user);
  }

  // ─── Detail View ───────────────────────────────────────────────────────────
  @Get('incoming-stock-reports/:id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any
  ) {
    return this.service.findOne(id, user);
  }

  // ─── Update Draft Report ───────────────────────────────────────────────────
  @Put('incoming-stock-reports/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateIncomingStockReportDto,
    @CurrentUser() user: any
  ) {
    const userId = user.userId || user.id || user.sub;
    return this.service.updateReport(id, dto, userId);
  }

  // ─── Submit Draft Report ───────────────────────────────────────────────────
  @Post('incoming-stock-reports/:id/submit')
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any
  ) {
    const userId = user.userId || user.id || user.sub;
    return this.service.submitReport(id, userId);
  }

  // ─── Approve Report (Admin Only) ───────────────────────────────────────────
  @Post('incoming-stock-reports/:id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body('itemIds') itemIds: number[],
    @CurrentUser() user: any
  ) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Ushbu amalni bajarish uchun sizda huquq yetarli emas.');
    }
    const userId = user.userId || user.id || user.sub;
    return this.service.approveReport(id, userId, itemIds);
  }

  // ─── Reject Report (Admin Only) ───────────────────────────────────────────
  @Post('incoming-stock-reports/:id/reject')
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Body('itemIds') itemIds: number[],
    @CurrentUser() user: any
  ) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Ushbu amalni bajarish uchun sizda huquq yetarli emas.');
    }
    const userId = user.userId || user.id || user.sub;
    return this.service.rejectReport(id, reason, userId, itemIds);
  }

  // ─── Notifications Endpoints ───────────────────────────────────────────────
  @Get('notifications')
  async getNotifications(@CurrentUser() user: any) {
    const userId = user.userId || user.id || user.sub;
    return this.service.getNotifications(userId);
  }

  @Put('notifications/read-all')
  async markAllNotificationsRead(@CurrentUser() user: any) {
    const userId = user.userId || user.id || user.sub;
    return this.service.markAllNotificationsAsRead(userId);
  }

  @Put('notifications/:id/read')
  async markNotificationRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any
  ) {
    const userId = user.userId || user.id || user.sub;
    return this.service.markNotificationAsRead(id, userId);
  }
}
