import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { HrService } from './hr.service';
import { HrTelegramBotService } from './hr-telegram-bot.service';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationDto } from './dto/update-job-application.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('hr')
export class HrController {
  constructor(
    private readonly hrService: HrService,
    private readonly hrTelegramBotService: HrTelegramBotService,
  ) {}

  @Get('applications/stats')
  async getStats() {
    return this.hrService.getStats();
  }

  @Get('applications')
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('position') position?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.hrService.findAll({
      search,
      status,
      position,
      startDate,
      endDate,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('applications/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.hrService.findOne(id);
  }

  @Post('applications')
  async create(@Body() createDto: CreateJobApplicationDto) {
    return this.hrService.create(createDto);
  }

  @Put('applications/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateJobApplicationDto,
  ) {
    const updated = await this.hrService.update(id, updateDto);

    // If status changed or interviewDate set and applicant has telegramId, notify them
    if (updated.telegramId) {
      try {
        if (updateDto.status === 'INTERVIEW') {
          const dateStr = updated.interviewDate
            ? new Date(updated.interviewDate).toLocaleString('uz-UZ', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Belgilangan vaqtda';

          await this.hrTelegramBotService.sendNotification(
            updated.telegramId,
            `📅 <b>Hurmatli ${updated.fullName}!</b>\n\n` +
              `Sizning arizangiz ko'rib chiqildi va siz <b>${updated.position || 'kompaniyamiz'}</b> lavozimi bo'yicha suhbatga taklif qilindingiz!\n\n` +
              `🏢 <b>Manzil:</b> Aminov texnika markazining Ko'na bozor filiali\n` +
              `⏰ <b>Suhbat vaqti:</b> <b>${dateStr}</b>\n\n` +
              `Sizni belgilangan sana va soatda <b>Aminov texnika markazining Ko'na bozor filiali</b>da kutamiz.\n\n` +
              (updated.notes ? `💬 <b>Qo'shimcha:</b> ${updated.notes}\n\n` : '') +
              `<i>Iltimos, o'z vaqtida kelishingizni va o'zingiz bilan shaxsni tasdiqlovchi hujjat olib kelishingizni so'raymiz.</i>`
          );
        } else if (updateDto.status === 'ACCEPTED') {
          await this.hrTelegramBotService.sendNotification(
            updated.telegramId,
            `🎉 <b>TABRIKLAYMIZ, ${updated.fullName}!</b>\n\n` +
              `Siz <b>${updated.position || 'kompaniyamiz'}</b> lavozimiga ishga qabul qilindingiz!\n` +
              `Tez orada HR menejerimiz ish boshlash tartibi bo'yicha siz bilan bog'lanadi.`
          );
        } else if (updateDto.status === 'REJECTED') {
          await this.hrTelegramBotService.sendNotification(
            updated.telegramId,
            `Hurmatli <b>${updated.fullName}</b>,\n\n` +
              `Kompaniyamizga bo'lgan qiziqishingiz uchun minnatdorchilik bildiramiz. Afsuski, ayni paytda arizangiz ma'qullanmadi. Kelgusidagi faoliyatingizda muvaffaqiyatlar tilaymiz!`
          );
        }
      } catch (_) {

      }
    }

    return updated;
  }

  @Post('applications/:id/notify')
  async notify(
    @Param('id', ParseIntPipe) id: number,
    @Body('message') message: string,
  ) {
    const app = await this.hrService.findOne(id);
    if (!app.telegramId) {
      return { success: false, message: 'Nomzodning Telegram ID si mavjud emas' };
    }
    await this.hrTelegramBotService.sendNotification(app.telegramId, message);
    return { success: true, message: 'Xabar yuborildi' };
  }

  @Delete('applications/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.hrService.remove(id);
  }
}
