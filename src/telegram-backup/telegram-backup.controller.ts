import { Controller, Post, Get, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TelegramBackupService } from './telegram-backup.service';

@ApiTags('Telegram Backup')
@Controller('telegram-backup')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TelegramBackupController {
  constructor(private readonly backupService: TelegramBackupService) {}

  @Post('trigger')
  @ApiOperation({ summary: 'Trigger database backup manually and send to Telegram' })
  async triggerBackup(@CurrentUser() user: any) {
    if (user?.role !== 'BIGADMIN' && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Faqat adminlar uchun ruxsat etilgan');
    }
    return this.backupService.runBackup();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get backup bot readiness status' })
  async getStatus(@CurrentUser() user: any) {
    if (user?.role !== 'BIGADMIN' && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Faqat adminlar uchun ruxsat etilgan');
    }
    return this.backupService.getStatus();
  }
}
