import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import TelegramBot = require('node-telegram-bot-api');
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

@Injectable()
export class TelegramBackupService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBackupService.name);
  private bot: TelegramBot;
  private chatId: string | undefined;
  private isReady = false;
  private backupDir: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');

    if (!token || !this.chatId) {
      this.logger.warn(
        '⚠️  TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID topilmadi. ' +
        'Telegram backup o\'chirilgan. .env faylini to\'ldiring.',
      );
      return;
    }

    try {
      this.bot = new TelegramBot(token, { polling: false });
      this.isReady = true;

      // Create backups directory
      this.backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      this.logger.log('✅ Telegram Backup Bot tayyor!');

      // Send startup notification
      this.sendTextMessage(
        '🟢 <b>Aminov DataBase Backup Bot</b> ishga tushdi!\n\n' +
        '📅 Har kuni yarim tunda (soat 00:00 da) database backup olinib yuboriladi.\n' +
        `🕐 Boshlangan vaqt: ${new Date().toLocaleString('uz-UZ')}`,
      );
    } catch (err) {
      this.logger.error('Telegram bot ishga tushmadi:', err.message);
    }
  }

  // ─── Run every day at midnight ──────────────────────────────────────────────
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runBackup() {
    if (!this.isReady) return;

    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);

    const fileName = `aminov_backup_${timestamp}.sql`;
    const filePath = path.join(this.backupDir, fileName);

    try {
      await this.dumpDatabase(filePath);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

      await this.sendBackupFile(filePath, fileName, sizeMB, now);

      this.logger.log(`✅ Backup yuborildi: ${fileName} (${sizeMB} MB)`);
    } catch (err) {
      this.logger.error('❌ Backup xatoligi:', err.message);
      await this.sendTextMessage(
        `❌ <b>Backup xatoligi!</b>\n\n` +
        `🕐 Vaqt: ${now.toLocaleString('uz-UZ')}\n` +
        `⚠️ Xato: <code>${err.message}</code>`,
      );
    } finally {
      // Clean up old backup files (keep last 5)
      this.cleanOldBackups();
    }
  }

  // ─── pg_dump database ────────────────────────────────────────────────────────
  private async dumpDatabase(filePath: string): Promise<void> {
    const dbUrl = this.configService.get<string>('DATABASE_URL');
    if (!dbUrl) throw new Error('DATABASE_URL topilmadi');

    // Parse DATABASE_URL: postgresql://user:pass@host:port/dbname
    const url = new URL(dbUrl.split('?')[0]);
    const user = url.username;
    const password = url.password;
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.replace('/', '');

    const env = {
      ...process.env,
      PGPASSWORD: password,
    };

    let pgDumpPath = this.configService.get<string>('PG_DUMP_PATH');
    if (!pgDumpPath) {
      const pathsToCheck = [
        // Mac OS (EnterpriseDB Postgres installer)
        '/Library/PostgreSQL/17/bin/pg_dump',
        '/Library/PostgreSQL/16/bin/pg_dump',
        '/Library/PostgreSQL/15/bin/pg_dump',
        // Linux Ubuntu / Debian (multi-version postgresql-client)
        '/usr/lib/postgresql/17/bin/pg_dump',
        '/usr/lib/postgresql/16/bin/pg_dump',
        '/usr/lib/postgresql/15/bin/pg_dump',
        // Fallback to globally available pg_dump in PATH
        'pg_dump',
      ];
      for (const p of pathsToCheck) {
        if (p === 'pg_dump') {
          pgDumpPath = 'pg_dump';
          break;
        }
        if (fs.existsSync(p)) {
          pgDumpPath = p;
          break;
        }
      }
    }

    const command = `"${pgDumpPath}" -U ${user} -h ${host} -p ${port} -d ${database} --no-owner --no-acl -F p -f "${filePath}"`;

    const { stderr } = await execAsync(command, { env });
    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(stderr);
    }

    // Add beautiful header to the dump file
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    const header = this.buildSqlHeader(database, new Date());
    fs.writeFileSync(filePath, header + originalContent);
  }

  private buildSqlHeader(dbName: string, date: Date): string {
    const line = '─'.repeat(60);
    return (
      `-- ${line}\n` +
      `--\n` +
      `--   🗃️  AMINOV DATABASE MA'LUMOTLARI\n` +
      `--\n` +
      `-- ${line}\n` +
      `--   📦 Ma'lumotlar bazasi : ${dbName}\n` +
      `--   📅 Sana               : ${date.toLocaleDateString('uz-UZ')}\n` +
      `--   🕐 Vaqt               : ${date.toLocaleTimeString('uz-UZ')}\n` +
      `--   🖥️  Server             : ${os.hostname()}\n` +
      `--   👤 Egasi              : Aminov Savdo Tizimi\n` +
      `--\n` +
      `-- ${line}\n` +
      `--   ⚠️  DIQQAT: Bu fayl maxfiy ma'lumotlarni o'z ichiga oladi!\n` +
      `--   Boshqa shaxslarga bermang.\n` +
      `-- ${line}\n\n`
    );
  }

  // ─── Send backup file to Telegram ───────────────────────────────────────────
  private async sendBackupFile(
    filePath: string,
    fileName: string,
    sizeMB: string,
    date: Date,
  ): Promise<void> {
    const caption =
      `🗃 <b>Aminov DataBase Ma'lumotlari</b>\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 <b>Sana:</b> ${date.toLocaleDateString('uz-UZ')}\n` +
      `🕐 <b>Vaqt:</b> ${date.toLocaleTimeString('uz-UZ')}\n` +
      `📦 <b>Fayl:</b> <code>${fileName}</code>\n` +
      `💾 <b>Hajmi:</b> ${sizeMB} MB\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ Backup muvaffaqiyatli olindi!`;

    await this.bot.sendDocument(
      this.chatId!,
      fs.createReadStream(filePath),
      {
        caption,
        parse_mode: 'HTML',
      },
      {
        filename: fileName,
        contentType: 'application/sql',
      },
    );
  }

  // ─── Send plain text message ─────────────────────────────────────────────────
  private async sendTextMessage(text: string): Promise<void> {
    try {
      if (!this.bot || !this.chatId) return;
      await this.bot.sendMessage(this.chatId!, text, { parse_mode: 'HTML' });
    } catch (err) {
      this.logger.error('Telegram xabar yuborishda xato:', err.message);
    }
  }

  // ─── Delete old backup files, keep last 5 ───────────────────────────────────
  private cleanOldBackups(): void {
    try {
      const files = fs
        .readdirSync(this.backupDir)
        .filter((f) => f.startsWith('aminov_backup_') && f.endsWith('.sql'))
        .map((f) => ({
          name: f,
          time: fs.statSync(path.join(this.backupDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      // Keep only last 5, delete the rest
      files.slice(5).forEach(({ name }) => {
        fs.unlinkSync(path.join(this.backupDir, name));
        this.logger.log(`🗑️  Eski backup o'chirildi: ${name}`);
      });
    } catch (err) {
      this.logger.warn('Eski backuplarni tozalashda xato:', err.message);
    }
  }
}
