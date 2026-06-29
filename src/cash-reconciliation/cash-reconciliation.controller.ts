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
  UseGuards, 
  Req,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { CashReconciliationService } from './cash-reconciliation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

interface AuthRequest extends Request {
  user: { id: number; role: string };
}

@Controller('cash-reconciliation')
@UseGuards(JwtAuthGuard)
export class CashReconciliationController {
  constructor(private readonly service: CashReconciliationService) {}

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('cashierId') cashierId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.findAll({ cashierId, branchId, status, startDate, endDate });
  }

  @Get('reports/shortages')
  getShortages(@Query('branchId') branchId?: string) {
    return this.service.getShortagesReport({ branchId });
  }

  @Get('reports/overages')
  getOverages(@Query('branchId') branchId?: string) {
    return this.service.getOveragesReport({ branchId });
  }

  @Get('reports/daily')
  getDaily(@Query('date') date: string, @Query('branchId') branchId?: string) {
    const parsedBranchId = branchId ? parseInt(branchId) : undefined;
    return this.service.getDailyReconciliation(date, parsedBranchId);
  }

  @Get('reports/monthly')
  getMonthly(
    @Query('year') year: string, 
    @Query('month') month: string, 
    @Query('branchId') branchId?: string
  ) {
    const parsedBranchId = branchId ? parseInt(branchId) : undefined;
    return this.service.getMonthlyReconciliation(parseInt(year), parseInt(month), parsedBranchId);
  }

  @Get('cashier/:cashierId')
  getCashierHistory(@Param('cashierId', ParseIntPipe) cashierId: number) {
    return this.service.getCashierHistory(cashierId);
  }

  @Get('branch/:branchId')
  getBranchHistory(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.service.getBranchHistory(branchId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @Body() dto: { reason?: string; notes?: string }
  ) {
    return this.service.approve(id, req.user.id, dto);
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @Body() dto: { reason: string; notes?: string }
  ) {
    return this.service.reject(id, req.user.id, dto);
  }

  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = join(__dirname, '..', '..', 'uploads', 'reconciliation');
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const filePath = `uploads/reconciliation/${file.filename}`;
    return this.service.addAttachment(id, req.user.id, {
      fileName: file.originalname,
      filePath,
    });
  }
}
