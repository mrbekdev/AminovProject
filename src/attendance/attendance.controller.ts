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
      console.log('FaceID check-in headers content-type:', ct);
      console.log('FaceID check-in body type:', bodyType, 'isArray:', isArray, 'ctor:', ctor);
      console.log('FaceID check-in body preview:', bodyType === 'string' ? (body as any).slice(0, 200) : JSON.stringify(body)?.slice(0, 500));
      console.log('FaceID check-in rawBody type:', rawType, 'preview:', rawType === 'string' ? String(raw).slice(0, 200) : rawType === 'object' ? JSON.stringify(raw)?.slice(0, 200) : rawType);

      // Log multipart fields
      const isMultipart = ct && String(ct).includes('multipart/form-data');
      if (isMultipart) {
        const fieldKeys = body && typeof body === 'object' ? Object.keys(body) : [];
        console.log('FaceID check-in multipart fields:', fieldKeys);
        for (const key of fieldKeys) {
          const val = body[key];
          const valType = val === null ? 'null' : typeof val;
          const looksLikeXml = valType === 'string' && /^\s*</.test(val);
          if (looksLikeXml) {
            const parsed = this.tryParseXml(val);
            console.log(`Field ${key} appears XML. Parsed JSON preview:`, JSON.stringify(parsed).slice(0, 800));
          } else {
            console.log(`Field ${key} (${valType}) preview:`, valType === 'string' ? String(val).slice(0, 200) : JSON.stringify(val)?.slice(0, 200));
          }
        }

        // Log files and parse XML files
        const f = Array.isArray(files) ? files : [];
        console.log('FaceID check-in files count:', f.length);
        for (const file of f) {
          const name = file.originalname;
          const mime = file.mimetype;
          console.log('File:', { name, mime, size: file.size });
          const isXml = (mime && (mime.includes('xml') || mime === 'text/plain')) || (name && name.toLowerCase().endsWith('.xml'));
          if (isXml) {
            try {
              const xmlText = file.buffer?.toString('utf8') ?? (file.path ? fs.readFileSync(file.path, 'utf8') : undefined);
              const parsed = this.tryParseXml(xmlText);
              console.log('XML file parsed to JSON preview:', JSON.stringify(parsed).slice(0, 1200));
            } catch (e) {
              console.log('Failed to parse XML file:', e);
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
          console.log('HTML preview build error:', e);
        }
      }
    } catch (e) {
      console.log('FaceID check-in log error:', e);
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
      console.log('FaceID check-out headers content-type:', ct);
      console.log('FaceID check-out body type:', bodyType, 'isArray:', isArray, 'ctor:', ctor);
      console.log('FaceID check-out body preview:', bodyType === 'string' ? (body as any).slice(0, 200) : JSON.stringify(body)?.slice(0, 500));
      console.log('FaceID check-out rawBody type:', rawType, 'preview:', rawType === 'string' ? String(raw).slice(0, 200) : rawType === 'object' ? JSON.stringify(raw)?.slice(0, 200) : rawType);

      const isMultipart = ct && String(ct).includes('multipart/form-data');
      if (isMultipart) {
        const fieldKeys = body && typeof body === 'object' ? Object.keys(body) : [];
        console.log('FaceID check-out multipart fields:', fieldKeys);
        for (const key of fieldKeys) {
          const val = body[key];
          const valType = val === null ? 'null' : typeof val;
          const looksLikeXml = valType === 'string' && /^\s*</.test(val);
          if (looksLikeXml) {
            const parsed = this.tryParseXml(val);
            console.log(`Field ${key} appears XML. Parsed JSON preview:`, JSON.stringify(parsed).slice(0, 800));
          } else {
            console.log(`Field ${key} (${valType}) preview:`, valType === 'string' ? String(val).slice(0, 200) : JSON.stringify(val)?.slice(0, 200));
          }
        }

        const f = Array.isArray(files) ? files : [];
        console.log('FaceID check-out files count:', f.length);
        for (const file of f) {
          const name = file.originalname;
          const mime = file.mimetype;
          console.log('File:', { name, mime, size: file.size });
          const isXml = (mime && (mime.includes('xml') || mime === 'text/plain')) || (name && name.toLowerCase().endsWith('.xml'));
          if (isXml) {
            try {
              const xmlText = file.buffer?.toString('utf8') ?? (file.path ? fs.readFileSync(file.path, 'utf8') : undefined);
              const parsed = this.tryParseXml(xmlText);
              console.log('XML file parsed to JSON preview:', JSON.stringify(parsed).slice(0, 1200));
            } catch (e) {
              console.log('Failed to parse XML file:', e);
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
          console.log('HTML preview build error (checkout):', e);
        }
      }
    } catch (e) {
      console.log('FaceID check-out log error:', e);
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
