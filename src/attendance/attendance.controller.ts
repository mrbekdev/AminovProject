import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import * as fs from 'fs';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @UseInterceptors(AnyFilesInterceptor())
  checkIn(
    @Req() req: Request,
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
      if (ct && String(ct).includes('multipart/form-data')) {
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

      if (ct && String(ct).includes('multipart/form-data')) {
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
              const xmlText = file.buffer?.toString('utf8');
              const parsed = this.tryParseXml(xmlText);
              console.log('XML file parsed to JSON preview:', JSON.stringify(parsed).slice(0, 1200));
            } catch (e) {
              console.log('Failed to parse XML file:', e);
            }
          }
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
