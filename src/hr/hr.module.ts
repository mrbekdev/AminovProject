import { Module } from '@nestjs/common';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { HrTelegramBotService } from './hr-telegram-bot.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HrController],
  providers: [HrService, HrTelegramBotService],
  exports: [HrService, HrTelegramBotService],
})
export class HrModule {}
