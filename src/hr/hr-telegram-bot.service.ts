import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import TelegramBot = require('node-telegram-bot-api');
import { HrService } from './hr.service';

interface UserSession {
  step: string;
  data: {
    fullName?: string;
    phone?: string;
    age?: number;
    position?: string;
    experience?: string;
    address?: string;
    expectedSalary?: string;
    about?: string;
    resumeUrl?: string;
    telegramId?: string;
    telegramUsername?: string;
  };
}

@Injectable()
export class HrTelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HrTelegramBotService.name);
  private bot: TelegramBot | null = null;
  private readonly token = '8888143813:AAGmrutnlwx-tyyM19ggKJ_qNcyW6Ol2DTk';
  private sessions = new Map<number, UserSession>();

  constructor(private readonly hrService: HrService) {}

  onModuleInit() {
    this.startBot();
  }

  onModuleDestroy() {
    this.stopBot();
  }

  private startBot() {
    try {
      this.bot = new TelegramBot(this.token, { polling: true });

      this.bot.on('polling_error', (error) => {
        this.logger.warn(`Telegram Bot Polling Error: ${error.message}`);
      });

      this.registerHandlers();
      this.logger.log('HR Telegram Bot started successfully.');
    } catch (err) {
      this.logger.error('Failed to initialize HR Telegram Bot:', err);
    }
  }

  private stopBot() {
    if (this.bot) {
      this.bot.stopPolling();
      this.bot = null;
      this.logger.log('HR Telegram Bot stopped.');
    }
  }

  public async sendNotification(telegramId: string, message: string) {
    if (!this.bot || !telegramId) return;
    try {
      await this.bot.sendMessage(telegramId, message, { parse_mode: 'HTML' });
    } catch (err) {
      this.logger.warn(`Failed to send telegram notification to ${telegramId}: ${err.message}`);
    }
  }

  private registerHandlers() {
    if (!this.bot) return;

    // /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.sessions.delete(chatId);
      this.sendWelcomeMessage(chatId, msg.from?.first_name || 'Hurmatli nomzod');
    });

    // /cancel command
    this.bot.onText(/\/cancel|❌ Bekor qilish/i, (msg) => {
      const chatId = msg.chat.id;
      this.sessions.delete(chatId);
      this.bot?.sendMessage(
        chatId,
        '❌ Ariza to\'ldirish bekor qilindi.\n\nQaytadan boshlash uchun /start buyrug\'ini bosing.',
        {
          reply_markup: {
            keyboard: [[{ text: '📝 Ishga ariza topshirish' }], [{ text: 'ℹ️ Ariza holatini tekshirish' }]],
            resize_keyboard: true,
          },
        }
      );
    });

    // Handle incoming messages
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text?.trim() || '';

      if (text.startsWith('/start') || text.startsWith('/cancel') || text === '❌ Bekor qilish') {
        return;
      }

      // Check main menu buttons
      if (text === '📝 Ishga ariza topshirish' || text === '📝 Qayta ariza topshirish') {
        this.startApplicationWizard(chatId, msg.from);
        return;
      }

      if (text === 'ℹ️ Ariza holatini tekshirish') {
        await this.checkApplicationStatus(chatId);
        return;
      }

      const session = this.sessions.get(chatId);
      if (!session) return;

      await this.handleWizardStep(chatId, msg, session);
    });

    // Handle callback queries (inline buttons)
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message?.chat.id;
      if (!chatId) return;
      const data = query.data;

      if (data === 'confirm_application') {
        await this.submitApplication(chatId, query.id);
      } else if (data === 'cancel_application') {
        this.sessions.delete(chatId);
        await this.bot?.answerCallbackQuery(query.id, { text: 'Bekor qilindi' });
        await this.bot?.sendMessage(
          chatId,
          '❌ Arizangiz bekor qilindi.\nQaytadan boshlash uchun quyidagi tugmani bosing.',
          {
            reply_markup: {
              keyboard: [[{ text: '📝 Ishga ariza topshirish' }], [{ text: 'ℹ️ Ariza holatini tekshirish' }]],
              resize_keyboard: true,
            },
          }
        );
      }
    });
  }

  private sendWelcomeMessage(chatId: number, name: string) {
    const text =
      `🏢 <b>Assalomu alaykum, ${name}!</b>\n\n` +
      `<b>Zippy & Aminov Holding</b> kompaniyasining ishga qabul qilish rasmiy botiga xush kelibsiz!\n\n` +
      `Biz doim o'z ishining ustasi bo'lgan, intiluvchan va mas'uliyatli mutaxassislarni o'z safimizda ko'rishdan mamnunmiz.\n\n` +
      `Arizangizni topshirish uchun <b>"📝 Ishga ariza topshirish"</b> tugmasini bosing.`;

    this.bot?.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [[{ text: '📝 Ishga ariza topshirish' }], [{ text: 'ℹ️ Ariza holatini tekshirish' }]],
        resize_keyboard: true,
      },
    });
  }

  private startApplicationWizard(chatId: number, from?: TelegramBot.User) {
    this.sessions.set(chatId, {
      step: 'FULL_NAME',
      data: {
        telegramId: String(chatId),
        telegramUsername: from?.username ? `@${from.username}` : undefined,
      },
    });

    this.bot?.sendMessage(
      chatId,
      '1️⃣ <b>Iltimos, to\'liq Ism va Familiyangizni kiriting:</b>\n<i>(Masalan: Alisher Vohidov)</i>',
      {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [[{ text: '❌ Bekor qilish' }]],
          resize_keyboard: true,
        },
      }
    );
  }

  private async handleWizardStep(chatId: number, msg: TelegramBot.Message, session: UserSession) {
    const text = msg.text?.trim() || '';

    switch (session.step) {
      case 'FULL_NAME': {
        if (!text || text.length < 3) {
          this.bot?.sendMessage(chatId, '⚠️ Iltimos, ism va familiyangizni to\'liq kiriting:');
          return;
        }
        session.data.fullName = text;
        session.step = 'PHONE';

        this.bot?.sendMessage(
          chatId,
          '2️⃣ <b>Telefon raqamingizni yuboring:</b>\nQuyidagi tugmani bosing yoki raqamingizni yozib yuboring:\n<i>(Masalan: +998901234567)</i>',
          {
            parse_mode: 'HTML',
            reply_markup: {
              keyboard: [
                [{ text: '📱 Telefon raqamni yuborish', request_contact: true }],
                [{ text: '❌ Bekor qilish' }],
              ],
              resize_keyboard: true,
            },
          }
        );
        break;
      }

      case 'PHONE': {
        let phone = '';
        if (msg.contact?.phone_number) {
          phone = msg.contact.phone_number;
          if (!phone.startsWith('+')) phone = `+${phone}`;
        } else if (text) {
          phone = text;
        }

        if (!phone || phone.length < 7) {
          this.bot?.sendMessage(chatId, '⚠️ Telefon raqamingizni to\'g\'ri formatda kiriting (Masalan: +998901234567):');
          return;
        }

        session.data.phone = phone;
        session.step = 'AGE';

        this.bot?.sendMessage(chatId, '3️⃣ <b>Yoshingizni kiriting:</b>\n<i>(Masalan: 24)</i>', {
          parse_mode: 'HTML',
          reply_markup: {
            keyboard: [
              [{ text: '18' }, { text: '20' }, { text: '22' }, { text: '25' }],
              [{ text: '28' }, { text: '30' }, { text: '35' }, { text: '40+' }],
              [{ text: '❌ Bekor qilish' }],
            ],
            resize_keyboard: true,
          },
        });
        break;
      }

      case 'AGE': {
        const ageNum = parseInt(text.replace(/[^0-9]/g, ''));
        if (!ageNum || isNaN(ageNum) || ageNum < 16 || ageNum > 80) {
          this.bot?.sendMessage(chatId, '⚠️ Iltimos, yoshingizni raqamda to\'g\'ri kiriting (16 dan 80 gacha):');
          return;
        }

        session.data.age = ageNum;
        session.step = 'POSITION';

        this.bot?.sendMessage(chatId, '4️⃣ <b>Qaysi lavozim / yo\'nalish bo\'yicha ishlamoqchisiz?</b>', {
          parse_mode: 'HTML',
          reply_markup: {
            keyboard: [
              [{ text: '🛍 Sotuvchi-maslahatchi' }, { text: '💳 Kassir' }],
              [{ text: '📞 Operator / Call-markaz' }, { text: '🚚 Kuryer / Yetkazib beruvchi' }],
              [{ text: '📊 Buxgalter' }, { text: '📦 Omborchi (Sklad)' }],
              [{ text: '🎯 SMM / Marketolog' }, { text: '⚙️ Boshqa lavozim' }],
              [{ text: '❌ Bekor qilish' }],
            ],
            resize_keyboard: true,
          },
        });
        break;
      }

      case 'POSITION': {
        if (!text) {
          this.bot?.sendMessage(chatId, '⚠️ Iltimos, lavozimni tanlang yoki yozing:');
          return;
        }

        session.data.position = text.replace(/^[^\w\sа-яА-ЯёЁ]+/u, '').trim();
        session.step = 'EXPERIENCE';

        this.bot?.sendMessage(
          chatId,
          '5️⃣ <b>Ish tajribangiz haqida ma\'lumot bering:</b>\n<i>(Qayerlarda ishlagansiz va qancha muddat?)</i>',
          {
            parse_mode: 'HTML',
            reply_markup: {
              keyboard: [
                [{ text: 'Tajribam yo\'q (O\'rganishga tayyorman)' }],
                [{ text: '1 yildan kam' }, { text: '1 - 3 yil' }],
                [{ text: '3 - 5 yil' }, { text: '5 yildan ortiq' }],
                [{ text: '❌ Bekor qilish' }],
              ],
              resize_keyboard: true,
            },
          }
        );
        break;
      }

      case 'EXPERIENCE': {
        if (!text) {
          this.bot?.sendMessage(chatId, '⚠️ Iltimos, ish tajribangiz haqida yozing:');
          return;
        }

        session.data.experience = text;
        session.step = 'ADDRESS';

        this.bot?.sendMessage(
          chatId,
          '6️⃣ <b>Hozirda yashash manzilingizni kiriting:</b>\n<i>(Viloyat, shahar/tuman, masalan: Toshkent sh., Chilonzor tumani)</i>',
          {
            parse_mode: 'HTML',
            reply_markup: {
              keyboard: [[{ text: 'Toshkent shahri' }], [{ text: 'Samarqand' }, { text: 'Buxoro' }], [{ text: 'Farg\'ona vodiysi' }], [{ text: '❌ Bekor qilish' }]],
              resize_keyboard: true,
            },
          }
        );
        break;
      }

      case 'ADDRESS': {
        if (!text) {
          this.bot?.sendMessage(chatId, '⚠️ Iltimos, manzilingizni kiriting:');
          return;
        }

        session.data.address = text;
        session.step = 'EXPECTED_SALARY';

        this.bot?.sendMessage(chatId, '7️⃣ <b>Kutilayotgan oylik maosh miqdori:</b>', {
          parse_mode: 'HTML',
          reply_markup: {
            keyboard: [
              [{ text: '3 000 000 - 5 000 000 so\'m' }],
              [{ text: '5 000 000 - 8 000 000 so\'m' }],
              [{ text: '8 000 000 - 12 000 000 so\'m' }],
              [{ text: 'Kelishiladi / Suhbat davomida' }],
              [{ text: '❌ Bekor qilish' }],
            ],
            resize_keyboard: true,
          },
        });
        break;
      }

      case 'EXPECTED_SALARY': {
        if (!text) {
          this.bot?.sendMessage(chatId, '⚠️ Iltimos, maosh miqdorini tanlang yoki yozing:');
          return;
        }

        session.data.expectedSalary = text;
        session.step = 'ABOUT';

        this.bot?.sendMessage(
          chatId,
          '8️⃣ <b>O\'zingiz haqingizda qo\'shimcha ma\'lumot:</b>\n' +
            '<i>Qobiliyatlaringiz, bilgan tillaringiz, kompyuter dasturlari yoki qo\'shimcha xususiyatlaringizni yozing:</i>',
          {
            parse_mode: 'HTML',
            reply_markup: {
              keyboard: [[{ text: 'O\'tkazib yuborish ⏭' }], [{ text: '❌ Bekor qilish' }]],
              resize_keyboard: true,
            },
          }
        );
        break;
      }

      case 'ABOUT': {
        if (text && text !== 'O\'tkazib yuborish ⏭') {
          session.data.about = text;
        }
        session.step = 'CONFIRMATION';
        await this.showSummaryAndConfirmation(chatId, session);
        break;
      }

      default:
        break;
    }
  }

  private async showSummaryAndConfirmation(chatId: number, session: UserSession) {
    const d = session.data;

    const summary =
      `📋 <b>ARIZANGIZ MA'LUMOTLARI:</b>\n\n` +
      `👤 <b>F.I.Sh:</b> ${d.fullName || '—'}\n` +
      `📱 <b>Telefon:</b> ${d.phone || '—'}\n` +
      `🎂 <b>Yoshi:</b> ${d.age ? `${d.age} yosh` : '—'}\n` +
      `💼 <b>Lavozim:</b> ${d.position || '—'}\n` +
      `⏳ <b>Tajriba:</b> ${d.experience || '—'}\n` +
      `📍 <b>Manzil:</b> ${d.address || '—'}\n` +
      `💰 <b>Kutilayotgan maosh:</b> ${d.expectedSalary || '—'}\n` +
      (d.about ? `📝 <b>Qo'shimcha:</b> ${d.about}\n` : '') +
      `\n<i>Barcha ma'lumotlar to'g'riligini tasdiqlaysizmi?</i>`;

    await this.bot?.sendMessage(chatId, summary, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Tasdiqlash va Yuborish', callback_data: 'confirm_application' },
            { text: '❌ Bekor qilish', callback_data: 'cancel_application' },
          ],
        ],
      },
    });
  }

  private async submitApplication(chatId: number, callbackQueryId: string) {
    const session = this.sessions.get(chatId);
    if (!session || !session.data.fullName || !session.data.phone) {
      await this.bot?.answerCallbackQuery(callbackQueryId, { text: 'Xatolik: Ma\'lumotlar topilmadi.' });
      return;
    }

    try {
      const application = await this.hrService.create({
        fullName: session.data.fullName,
        phone: session.data.phone,
        age: session.data.age,
        position: session.data.position,
        experience: session.data.experience,
        address: session.data.address,
        expectedSalary: session.data.expectedSalary,
        about: session.data.about,
        telegramId: session.data.telegramId,
        telegramUsername: session.data.telegramUsername,
        status: 'NEW',
      });

      this.sessions.delete(chatId);

      await this.bot?.answerCallbackQuery(callbackQueryId, { text: 'Arizangiz qabul qilindi!' });

      const successMsg =
        `🎉 <b>TABRIKLAYMIZ!</b>\n\n` +
        `Sizning arizangiz muvaffaqiyatli qabul qilindi!\n` +
        `🆔 <b>Ariza raqami:</b> #${application.id}\n\n` +
        `HR mutaxassislarimiz ma'lumotlaringizni ko'rib chiqib, tez orada siz bilan bog'lanishadi.\n\n` +
        `E'tiboringiz va qiziqishingiz uchun rahmat! 🤝`;

      await this.bot?.sendMessage(chatId, successMsg, {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [[{ text: 'ℹ️ Ariza holatini tekshirish' }], [{ text: '📝 Qayta ariza topshirish' }]],
          resize_keyboard: true,
        },
      });
    } catch (err) {
      this.logger.error('Error saving job application:', err);
      await this.bot?.answerCallbackQuery(callbackQueryId, { text: 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.' });
      await this.bot?.sendMessage(
        chatId,
        '⚠️ Arizani saqlashda xatolik yuz berdi. Iltimos, /start buyrug\'i orqali qaytadan urinib ko\'ring.'
      );
    }
  }

  private async checkApplicationStatus(chatId: number) {
    try {
      const list = await this.hrService.findByTelegramId(String(chatId));

      if (!list || list.length === 0) {
        await this.bot?.sendMessage(
          chatId,
          'Siz hali hech qanday ariza topshirmagansiz.\n\nAriza topshirish uchun <b>"📝 Ishga ariza topshirish"</b> tugmasini bosing.',
          {
            parse_mode: 'HTML',
            reply_markup: {
              keyboard: [[{ text: '📝 Ishga ariza topshirish' }]],
              resize_keyboard: true,
            },
          }
        );
        return;
      }

      const latest = list[0];
      const statusMap: Record<string, string> = {
        NEW: '🆕 Yangi (Ko\'rib chiqilmoqda)',
        IN_REVIEW: '🔍 Ko\'rib chiqilmoqda',
        INTERVIEW: '📅 Suhbatga chaqirildingiz!',
        ACCEPTED: '✅ Ishga qabul qilindingiz!',
        REJECTED: '❌ Arizangiz rad etildi',
      };

      const statusText = statusMap[latest.status] || latest.status;

      let msg =
        `📄 <b>SIZNING ARIZANGIZ HOLATI:</b>\n\n` +
        `🆔 <b>Ariza raqami:</b> #${latest.id}\n` +
        `👤 <b>Nomzod:</b> ${latest.fullName}\n` +
        `📱 <b>Telefon:</b> ${latest.phone}\n` +
        `💼 <b>Lavozim:</b> ${latest.position || '—'}\n` +
        `📅 <b>Topshirilgan sana:</b> ${new Date(latest.createdAt).toLocaleDateString('uz-UZ')}\n` +
        `📊 <b>Holati:</b> <b>${statusText}</b>\n`;

      if (latest.status === 'INTERVIEW' && latest.interviewDate) {
        msg += `\n⏰ <b>Suhbat vaqti:</b> <b>${new Date(latest.interviewDate).toLocaleString('uz-UZ')}</b>\n`;
      }

      if (latest.notes) {
        msg += `\n💬 <b>HR eslatmasi:</b> ${latest.notes}\n`;
      }

      await this.bot?.sendMessage(chatId, msg, {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [[{ text: 'ℹ️ Ariza holatini tekshirish' }], [{ text: '📝 Qayta ariza topshirish' }]],
          resize_keyboard: true,
        },
      });
    } catch (err) {
      this.logger.error('Error checking application status:', err);
      await this.bot?.sendMessage(chatId, 'Ma\'lumotlarni olishda xatolik yuz berdi.');
    }
  }
}
