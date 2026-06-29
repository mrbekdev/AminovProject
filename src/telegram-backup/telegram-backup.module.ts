import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegramBackupService } from './telegram-backup.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TelegramBackupService],
  exports: [TelegramBackupService],
})
export class TelegramBackupModule {}
