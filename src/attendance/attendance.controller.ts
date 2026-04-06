import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

    // In-memory latest event/image for preview purposes
  private lastEventPayload: any = null;
  private lastImageDataUrl: string | null = null;
  private lastUpdatedAt: string | null = null;

  @Post('check-in')
  @UseInterceptors(AnyFilesInterceptor())
  checkIn(
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Body() body: any,
  ) {
    const b: any = body || {};
    const ct = req.headers['content-type'];
    const bodyType = body === null ? 'null' : typeof body;
    const isArray = Array.isArray(body);
    const ctor = (body as any)?.constructor?.name;
    const raw = (req as any).rawBody;
    const rawType = raw === undefined ? 'undefined' : (raw === null ? 'null' : typeof raw);
    try {

      // Log multipart fields
      const isMultipart = ct && String(ct).includes('multipart/form-data');
      if (isMultipart) {
        const fieldKeys = body && typeof body === 'object' ? Object.keys(body) : [];
        for (const key of fieldKeys) {
          const val = body[key];
          const valType = val === null ? 'null' : typeof val;
          const looksLikeXml = valType === 'string' && /^\s*</.test(val);
          if (looksLikeXml) {
            const parsed = this.tryParseXml(val);
          } else {
          }
        }

        // Log files and parse XML files
        const f = Array.isArray(files) ? files : [];
        for (const file of f) {
          const name = file.originalname;
          const mime = file.mimetype;
          const isXml = (mime && (mime.includes('xml') || mime === 'text/plain')) || (name && name.toLowerCase().endsWith('.xml'));
          if (isXml) {
            try {
              const xmlText = file.buffer?.toString('utf8') ?? (file.path ? fs.readFileSync(file.path, 'utf8') : undefined);
              const parsed = this.tryParseXml(xmlText);
            } catch (e) {
            }
          }
        }
        // Prepare data for preview (save to memory)
        try {
          const rawEventLog = body?.event_log;
          let parsedEvent: any = null;
          if (typeof rawEventLog === 'string') {
            try { parsedEvent = JSON.parse(rawEventLog); } catch {}
          } else if (typeof rawEventLog === 'object' && rawEventLog) {
            parsedEvent = rawEventLog;
          }

          // Choose first image file if exists
          const imageFile = f.find(file => (file.mimetype || '').startsWith('image/'));
          let imgSrc = '';
          if (imageFile) {
            try {
              const mime = imageFile.mimetype || 'image/jpeg';
              const b64 = imageFile.buffer ? imageFile.buffer.toString('base64') : (imageFile.path ? fs.readFileSync(imageFile.path).toString('base64') : '');
              if (b64) imgSrc = `data:${mime};base64,${b64}`;
            } catch {}
          }

          // Save in memory for GET preview
          this.lastEventPayload = parsedEvent ?? rawEventLog ?? null;
          this.lastImageDataUrl = imgSrc || null;
          this.lastUpdatedAt = new Date().toISOString();

          // Build and send HTML preview to frontend directly
          
          const html = `<!doctype html>
          <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>FaceID Check-In Preview</title>
            <style>
              body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; margin:16px;}
              .wrap{max-width:900px;margin:0 auto}
              pre{background:#0f172a; color:#e2e8f0; padding:12px; border-radius:8px; overflow:auto}
              .img{margin-top:16px}
              img{max-width:100%;height:auto;border-radius:8px;border:1px solid #e5e7eb}
              .meta{color:#334155;margin-bottom:8px}
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="meta">content-type: ${String(ct)}</div>
              <h2>FaceID Check-In</h2>
              <h3>event_log</h3>
              <pre>${parsedEvent ? JSON.stringify(parsedEvent, null, 2) : (typeof rawEventLog === 'string' ? rawEventLog.replace(/</g,'&lt;') : 'No event_log')}</pre>
              ${imgSrc ? `<div class="img"><h3>Picture</h3><img src="${imgSrc}" alt="Picture"/></div>` : ''}
            </div>
          </body>
          </html>`;

          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.status(200).send(html);
        } catch (e) {
        }
      }
    } catch (e) {
    }

    return this.attendanceService.checkIn({
      userId: b.userId,
      faceTemplateId: b.faceTemplateId,
      branchId: b.branchId,
      deviceId: b.deviceId,
      similarity: b.similarity,
      payload: b.payload,
    });
  }

  @Post('check-out')
  @UseInterceptors(AnyFilesInterceptor())
  checkOut(
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Body() body: any,
  ) {
    const ct = req.headers['content-type'];
    const bodyType = body === null ? 'null' : typeof body;
    const isArray = Array.isArray(body);
    const ctor = (body as any)?.constructor?.name;
    const raw = (req as any).rawBody;
    const rawType = raw === undefined ? 'undefined' : (raw === null ? 'null' : typeof raw);
    try {

      const isMultipart = ct && String(ct).includes('multipart/form-data');
      if (isMultipart) {
        const fieldKeys = body && typeof body === 'object' ? Object.keys(body) : [];
        for (const key of fieldKeys) {
          const val = body[key];
          const valType = val === null ? 'null' : typeof val;
          const looksLikeXml = valType === 'string' && /^\s*</.test(val);
          if (looksLikeXml) {
            const parsed = this.tryParseXml(val);
          } else {
          }
        }

        const f = Array.isArray(files) ? files : [];
        for (const file of f) {
          const name = file.originalname;
          const mime = file.mimetype;
          const isXml = (mime && (mime.includes('xml') || mime === 'text/plain')) || (name && name.toLowerCase().endsWith('.xml'));
          if (isXml) {
            try {
              const xmlText = file.buffer?.toString('utf8') ?? (file.path ? fs.readFileSync(file.path, 'utf8') : undefined);
              const parsed = this.tryParseXml(xmlText);
            } catch (e) {
            }
          }
        }

        // Prepare and send HTML preview (also save to memory)
        try {
          const rawEventLog = body?.event_log;
          let parsedEvent: any = null;
          if (typeof rawEventLog === 'string') {
            try { parsedEvent = JSON.parse(rawEventLog); } catch {}
          } else if (typeof rawEventLog === 'object' && rawEventLog) {
            parsedEvent = rawEventLog;
          }

          const imageFile = f.find(file => (file.mimetype || '').startsWith('image/'));
          let imgSrc = '';
          if (imageFile) {
            try {
              const mime = imageFile.mimetype || 'image/jpeg';
              const b64 = imageFile.buffer ? imageFile.buffer.toString('base64') : (imageFile.path ? fs.readFileSync(imageFile.path).toString('base64') : '');
              if (b64) imgSrc = `data:${mime};base64,${b64}`;
            } catch {}
          }

          const html = `<!doctype html>
          <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>FaceID Check-Out Preview</title>
            <style>
              body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; margin:16px;}
              .wrap{max-width:900px;margin:0 auto}
              pre{background:#0f172a; color:#e2e8f0; padding:12px; border-radius:8px; overflow:auto}
              .img{margin-top:16px}
              img{max-width:100%;height:auto;border-radius:8px;border:1px solid #e5e7eb}
              .meta{color:#334155;margin-bottom:8px}
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="meta">content-type: ${String(ct)}</div>
              <h2>FaceID Check-Out</h2>
              <h3>event_log</h3>
              <pre>${parsedEvent ? JSON.stringify(parsedEvent, null, 2) : (typeof rawEventLog === 'string' ? rawEventLog.replace(/</g,'&lt;') : 'No event_log')}</pre>
              ${imgSrc ? `<div class=\"img\"><h3>Picture</h3><img src=\"${imgSrc}\" alt=\"Picture\"/></div>` : ''}
            </div>
          </body>
          </html>`;

          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.status(200).send(html);
        } catch (e) {
        }
      }
    } catch (e) {
    }
    const b: any = body || {};
    return this.attendanceService.checkOut({
      userId: b.userId,
      faceTemplateId: b.faceTemplateId,
      branchId: b.branchId,
      deviceId: b.deviceId,
      similarity: b.similarity,
      payload: b.payload,
    });
  }

  // Best-effort XML -> JSON for logging (uses fast-xml-parser if available)
  private tryParseXml(xmlText?: string): any {
    if (!xmlText || typeof xmlText !== 'string') return { kind: 'xml', raw: xmlText };
    try {
      // Try fast-xml-parser if installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fxp = require('fast-xml-parser');
      const parser = new fxp.XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      return { kind: 'xml-json', parsed: parser.parse(xmlText) };
    } catch {
      // Fallback: return raw
      return { kind: 'xml-raw', raw: xmlText.slice(0, 5000) };
    }
  }

  @Post()
  createManual(@Body() body: any) {
    return this.attendanceService.createManual(body);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.attendanceService.findAll(query);
  }

  @Get('last')
  getLast() {
    return {
      updatedAt: this.lastUpdatedAt,
      event: this.lastEventPayload,
      imageDataUrl: this.lastImageDataUrl,
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.attendanceService.update(+id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(+id);
  }

  // Face registration and management
  @Post('register-face')
  registerFace(@Body() body: any) {
    return this.attendanceService.registerFace(body);
  }

  @Get('faces')
  listFaces(@Query() query: any) {
    return this.attendanceService.listFaces(query);
  }

  @Delete('faces/:id')
  deleteFace(@Param('id') id: string) {
    return this.attendanceService.deleteFace(+id);
  }
}
