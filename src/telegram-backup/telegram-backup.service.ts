import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import TelegramBot = require('node-telegram-bot-api');
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as zlib from 'zlib';

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
      this.bot = new TelegramBot(token, {
        polling: false,
        request: {
          timeout: 300000, // 5 minutes timeout for large file uploads
        } as any,
      });
      this.isReady = true;

      // Create backups directory
      this.backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      this.logger.log('✅ Telegram Backup Bot tayyor!');

      // Clean any existing leftover backups from server storage immediately
      this.cleanAllBackups();

      // Send startup notification
      this.sendTextMessage(
        '🟢 <b>Aminov DataBase Backup Bot</b> ishga tushdi!\n\n' +
        '📅 Har kuni yarim tunda (soat 00:00 da) database backup olinib yuboriladi.\n' +
        '🗜️ Katta hajmli bazalar avtomatik ravishda siqiladi (.sql.gz) va kerak bo\'lsa bo\'laklarga bo\'linadi.\n' +
        `🕐 Boshlangan vaqt: ${new Date().toLocaleString('uz-UZ')}`,
      );
    } catch (err) {
      this.logger.error('Telegram bot ishga tushmadi:', err.message);
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      chatIdConfigured: !!this.chatId,
      backupDir: this.backupDir,
    };
  }

  // ─── Run every day at midnight ──────────────────────────────────────────────
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runBackup(): Promise<{ success: boolean; message: string; fileName?: string; rawSizeMB?: string; gzSizeMB?: string }> {
    if (!this.isReady) {
      return { success: false, message: 'Telegram backup bot tayyor emas yoki token/chatId kiritilmagan' };
    }

    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);

    const baseName = `aminov_backup_${timestamp}`;
    const rawSqlPath = path.join(this.backupDir, `${baseName}.sql`);
    const gzFileName = `${baseName}.sql.gz`;
    const gzFilePath = path.join(this.backupDir, gzFileName);

    try {
      this.logger.log(`🔄 Database dump boshlanmoqda...`);
      const databaseName = await this.dumpDatabase(rawSqlPath);

      const rawStats = fs.statSync(rawSqlPath);
      const rawSizeMB = (rawStats.size / 1024 / 1024).toFixed(2);
      this.logger.log(`📦 SQL dump tayyor: ${rawSizeMB} MB. Siqish boshlanmoqda (gzip)...`);

      // Compress SQL to .sql.gz and prepend header via stream without loading entire file to RAM
      const header = this.buildSqlHeader(databaseName, now);
      await this.compressSqlFile(rawSqlPath, gzFilePath, header);

      // Clean up raw uncompressed SQL file
      try {
        fs.unlinkSync(rawSqlPath);
      } catch (e) {
        this.logger.warn(`Vaqtinchalik SQL faylni o'chirishda ogohlantirish: ${e.message}`);
      }

      const gzStats = fs.statSync(gzFilePath);
      const gzSizeMB = (gzStats.size / 1024 / 1024).toFixed(2);
      this.logger.log(`🗜️ Siqilgan fayl tayyor: ${gzSizeMB} MB (Asl hajmi: ${rawSizeMB} MB)`);

      // Send backup file (or chunked parts if > 48MB)
      await this.sendBackupFiles(gzFilePath, gzFileName, rawSizeMB, gzSizeMB, now);

      this.logger.log(`✅ Backup yuborildi: ${gzFileName} (${gzSizeMB} MB)`);
      return {
        success: true,
        message: 'Backup muvaffaqiyatli olindi va Telegramga yuborildi',
        fileName: gzFileName,
        rawSizeMB,
        gzSizeMB,
      };
    } catch (err) {
      this.logger.error('❌ Backup xatoligi:', err.message);
      await this.sendTextMessage(
        `❌ <b>Backup xatoligi!</b>\n\n` +
        `🕐 Vaqt: ${now.toLocaleString('uz-UZ')}\n` +
        `⚠️ Xato: <code>${err.message}</code>`,
      );
      return {
        success: false,
        message: err.message,
      };
    } finally {
      // Clean up all temporary backup files from server completely (0 bytes left on disk)
      this.cleanAllBackups();
    }
  }

  // ─── pg_dump database ────────────────────────────────────────────────────────
  private async dumpDatabase(filePath: string): Promise<string> {
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

    const { stderr } = await execAsync(command, { env, maxBuffer: 1024 * 1024 * 50 });
    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(stderr);
    }

    return database;
  }

  // ─── Compress SQL to .gz with header via streaming ──────────────────────────
  private async compressSqlFile(
    rawSqlPath: string,
    gzFilePath: string,
    header: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const gzip = zlib.createGzip({ level: 9 });
      const readStream = fs.createReadStream(rawSqlPath);
      const writeStream = fs.createWriteStream(gzFilePath);

      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
      readStream.on('error', (err) => reject(err));
      gzip.on('error', (err) => reject(err));

      gzip.pipe(writeStream);

      // Write header first into gzip
      gzip.write(Buffer.from(header, 'utf-8'));

      // Pipe the raw SQL file into gzip
      readStream.pipe(gzip);
    });
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

  // ─── Send backup file(s) to Telegram (with automatic splitting if > 48MB) ────
  private async sendBackupFiles(
    gzFilePath: string,
    gzFileName: string,
    rawSizeMB: string,
    gzSizeMB: string,
    date: Date,
  ): Promise<void> {
    const MAX_TELEGRAM_FILE_SIZE = 48 * 1024 * 1024; // 48 MB safety margin (Telegram limit is 50 MB)
    const CHUNK_SIZE = 45 * 1024 * 1024; // 45 MB per chunk

    const stats = fs.statSync(gzFilePath);

    // If file is within Telegram limit (50 MB)
    if (stats.size <= MAX_TELEGRAM_FILE_SIZE) {
      const caption =
        `🗃 <b>Aminov DataBase Ma'lumotlari</b>\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📅 <b>Sana:</b> ${date.toLocaleDateString('uz-UZ')}\n` +
        `🕐 <b>Vaqt:</b> ${date.toLocaleTimeString('uz-UZ')}\n` +
        `📦 <b>Fayl:</b> <code>${gzFileName}</code>\n` +
        `💾 <b>Hajmi:</b> ${gzSizeMB} MB <i>(asl SQL hajmi: ${rawSizeMB} MB)</i>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ Backup muvaffaqiyatli olindi va arxivlandi (.sql.gz)!`;

      await this.bot.sendDocument(
        this.chatId!,
        fs.createReadStream(gzFilePath),
        {
          caption,
          parse_mode: 'HTML',
        },
        {
          filename: gzFileName,
          contentType: 'application/gzip',
        },
      );
      return;
    }

    // If compressed size is still > 48MB, split into multiple parts
    const totalParts = Math.ceil(stats.size / CHUNK_SIZE);
    this.logger.warn(
      `⚠️ Arxiv hajmi (${gzSizeMB} MB) Telegram 50 MB limitidan oshdi! ${totalParts} ta qismga bo'lib yuborilmoqda...`,
    );

    const partFiles: string[] = [];
    const buffer = Buffer.alloc(256 * 1024);
    const fd = fs.openSync(gzFilePath, 'r');
    try {
      for (let i = 0; i < totalParts; i++) {
        const partFileName = `${gzFileName}.part${i + 1}`;
        const partPath = path.join(this.backupDir, partFileName);
        const outFd = fs.openSync(partPath, 'w');
        let bytesWrittenForPart = 0;

        while (bytesWrittenForPart < CHUNK_SIZE) {
          const bytesToRead = Math.min(buffer.length, CHUNK_SIZE - bytesWrittenForPart);
          const bytesRead = fs.readSync(fd, buffer, 0, bytesToRead, null);
          if (bytesRead === 0) break;
          fs.writeSync(outFd, buffer, 0, bytesRead);
          bytesWrittenForPart += bytesRead;
        }
        fs.closeSync(outFd);
        partFiles.push(partPath);
      }
    } finally {
      fs.closeSync(fd);
    }

    await this.sendTextMessage(
      `📦 <b>Aminov DataBase Katta Hajmli Backup</b>\n\n` +
      `⚠️ Fayl hajmi 50 MB dan katta bo'lgani uchun <b>${totalParts} ta qismga</b> bo'lindi.\n` +
      `📊 Umumiy siqilgan hajm: <b>${gzSizeMB} MB</b> (asl SQL hajmi: <b>${rawSizeMB} MB</b>)\n` +
      `📅 Sana: ${date.toLocaleDateString('uz-UZ')} ${date.toLocaleTimeString('uz-UZ')}`,
    );

    for (let i = 0; i < partFiles.length; i++) {
      const partPath = partFiles[i];
      const partFileName = path.basename(partPath);
      const partStats = fs.statSync(partPath);
      const partSizeMB = (partStats.size / 1024 / 1024).toFixed(2);

      const caption =
        `🗃 <b>Aminov DataBase (${i + 1}/${totalParts}-qism)</b>\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>Fayl:</b> <code>${partFileName}</code>\n` +
        `💾 <b>Qism hajmi:</b> ${partSizeMB} MB\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 <i>Birlashtirish buyrug'i:</i>\n` +
        `<code>cat ${gzFileName}.part* > ${gzFileName} && gunzip ${gzFileName}</code>`;

      await this.bot.sendDocument(
        this.chatId!,
        fs.createReadStream(partPath),
        {
          caption,
          parse_mode: 'HTML',
        },
        {
          filename: partFileName,
          contentType: 'application/octet-stream',
        },
      );

      if (i < partFiles.length - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    // Clean up temporary part files
    for (const partPath of partFiles) {
      try {
        fs.unlinkSync(partPath);
      } catch (e) {
        // ignore
      }
    }
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

  // ─── Delete all backup files from server disk completely ───────────────────
  private cleanAllBackups(): void {
    try {
      if (!fs.existsSync(this.backupDir)) return;
      const files = fs.readdirSync(this.backupDir);
      for (const file of files) {
        if (
          file.startsWith('aminov_backup_') ||
          file.endsWith('.sql') ||
          file.endsWith('.sql.gz') ||
          file.includes('.part')
        ) {
          try {
            fs.unlinkSync(path.join(this.backupDir, file));
            this.logger.log(`🗑️  Backup server diskidan tozalandi: ${file}`);
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (err) {
      this.logger.warn('Backuplarni tozalashda xato:', err.message);
    }
  }
}
