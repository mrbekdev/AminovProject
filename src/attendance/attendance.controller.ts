import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  checkIn(@Req() req: Request, @Body() body: CheckInDto) {
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
  checkOut(@Req() req: Request, @Body() body: CheckOutDto) {
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
