import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  checkIn(@Body() body: CheckInDto) {
    const b: any = body || {};
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
  checkOut(@Body() body: CheckOutDto) {
    console.log("Face id dan sorov keldi", body);
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
