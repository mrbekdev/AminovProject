import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  checkIn(@Body() body: CheckInDto) {
    return this.attendanceService.checkIn({
      userId: body.userId,
      branchId: body.branchId,
      deviceId: body.deviceId,
      similarity: body.similarity,
      payload: body.payload,
    });
  }

  @Post('check-out')
  checkOut(@Body() body: CheckOutDto) {
    console.log("Face id dan sorov keldi", body);
    return this.attendanceService.checkOut({
      userId: body.userId,
      branchId: body.branchId,
      deviceId: body.deviceId,
      similarity: body.similarity,
      payload: body.payload,
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
