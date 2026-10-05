import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegramBackupService } from './telegram-backup.service';
import { TelegramBackupController } from './telegram-backup.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [TelegramBackupController],
  providers: [TelegramBackupService],
  exports: [TelegramBackupService],
})
export class TelegramBackupModule {}
