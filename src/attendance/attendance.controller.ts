import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, Res, UseGuards, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { Request, Response } from 'express';
import { AttendanceService } from './attendance.service';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly prisma: PrismaService,
  ) {}

  // ===== Express Kiosk Scan =====
  @Post('attendance/express-scan')
  expressScan(@Body() body: any) {
    return this.attendanceService.expressScan(body);
  }

  // ===== Kiosk Employees List =====
  @Get('attendance/kiosk-employees')
  getKioskEmployees() {
    return this.attendanceService.getKioskEmployees();
  }

  // ===== Audit Logs =====
  @Get('attendance/all-logs')
  getAllLogs() {
    return this.attendanceService.getAllLogs();
  }

  // ===== Logged Employee Attendance History =====
  @Get('attendance/my-history')
  getMyHistory(@Req() req: any) {
    const userId = req.user?.id || 1;
    return this.attendanceService.getMyHistory(userId);
  }

  // ===== Admin Dashboard Stats =====
  @Get('dashboard/admin')
  getAdminDashboard(@Query() query: any) {
    return this.attendanceService.getAdminDashboard(query);
  }

  // ===== Employee Dashboard Stats =====
  @Get('dashboard/employee')
  getEmployeeDashboard(@Req() req: any) {
    const userId = req.user?.id || 1;
    return this.attendanceService.getEmployeeDashboard(userId);
  }

  // ===== Departments List =====
  @Get('departments')
  getDepartments() {
    return [
      { id: 'ADMIN', name: 'Маъмурият' },
      { id: 'MARKETING', name: 'Савдо зали' },
      { id: 'CASHIER', name: 'Касса бўлими' },
      { id: 'WAREHOUSE', name: 'Омборхона' },
      { id: 'HISOBCHI', name: 'Бухгалтерия' },
      { id: 'AUDITOR', name: 'Доставка' },
      { id: 'OPERATOR', name: 'Оператор' },
      { id: 'DEBTCASHIER', name: 'Насия касса' },
      { id: 'NAZORATCHI', name: 'Назорат' },
    ];
  }

  // ===== Reports Data =====
  @Get('reports/data')
  getReportData(@Query() query: any) {
    return this.attendanceService.getReportData(query);
  }

  @Get('reports/export/:format')
  exportReport(@Param('format') format: string, @Res() res: Response) {
    const csvContent = 'xodim,sana,check_in,check_out,status\nAdmin,2026-08-31,09:00,18:00,PRESENT';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="davomat_report.${format === 'excel' ? 'csv' : format}"`);
    return res.send(csvContent);
  }

  // ===== Employees Endpoints (linked directly to User) =====
  @Get('employees')
  async getEmployees(@Query() query: any) {
    const where: any = { status: 'ACTIVE' };
    if (query.store_id && query.store_id !== 'ALL') {
      where.storeId = parseInt(query.store_id);
    }
    const users = await this.prisma.user.findMany({
      where,
      include: { branch: true, store: true, faceTemplates: true },
      orderBy: { firstName: 'asc' },
    });

    return users.map(u => ({
      id: u.id,
      username: u.username,
      first_name: u.firstName || u.username,
      last_name: u.lastName || '',
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
      phone: u.phone || '',
      position: u.position || u.role,
      department: { id: u.role, name: u.role },
      monthly_salary: u.monthlySalary || 5000000,
      work_start_time: u.workStartTime || '09:00',
      work_end_time: u.workEndTime || '18:00',
      store_id: u.storeId,
      branch_id: u.branchId,
      has_face: u.faceTemplates.length > 0,
      face_count: u.faceTemplates.length,
      faceTemplates: u.faceTemplates,
      face_encodings: u.faceTemplates.map(ft => ({
        id: ft.id,
        image_path: ft.imageUrl || (ft.template ? `data:image/jpeg;base64,${ft.template}` : ''),
      })),
    }));
  }

  @Post('employees')
  async createEmployee(@Body() body: any) {
    const role = body.position === 'Кассир' ? 'CASHIER' : body.position === 'Складчи' ? 'WAREHOUSE' : 'MARKETING';
    return this.prisma.user.create({
      data: {
        username: body.username || `user_${Date.now()}`,
        password: body.password || '123456',
        firstName: body.first_name || '',
        lastName: body.last_name || '',
        phone: body.phone || null,
        position: body.position || 'Сотувчи',
        monthlySalary: Number(body.monthly_salary) || 5000000,
        workStartTime: body.work_start_time || '09:00',
        workEndTime: body.work_end_time || '18:00',
        storeId: body.store_id ? Number(body.store_id) : null,
        role: role as any,
      },
    });
  }

  @Put('employees/:id')
  async updateEmployee(@Param('id') id: string, @Body() body: any) {
    const updateData: any = {};
    if (body.first_name !== undefined) updateData.firstName = body.first_name;
    if (body.last_name !== undefined) updateData.lastName = body.last_name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.position !== undefined) updateData.position = body.position;
    if (body.monthly_salary !== undefined) updateData.monthlySalary = Number(body.monthly_salary);
    if (body.work_start_time !== undefined) updateData.workStartTime = body.work_start_time;
    if (body.work_end_time !== undefined) updateData.workEndTime = body.work_end_time;
    if (body.store_id !== undefined) updateData.storeId = body.store_id ? Number(body.store_id) : null;

    return this.prisma.user.update({
      where: { id: +id },
      data: updateData,
    });
  }

  @Delete('employees/:id')
  async deleteEmployee(@Param('id') id: string) {
    return this.prisma.user.update({
      where: { id: +id },
      data: { status: 'DELETED' },
    });
  }

  @Delete('employees/:empId/faces/:faceId')
  async deleteEmployeeFace(@Param('faceId') faceId: string) {
    return this.attendanceService.deleteFace(+faceId);
  }

  @Delete('employees/:empId/faces')
  async deleteAllEmployeeFaces(@Param('empId') empId: string) {
    return this.prisma.faceTemplate.deleteMany({
      where: { userId: +empId },
    });
  }

  @Post('employees/:id/register-camera-faces')
  async registerCameraFaces(@Param('id') id: string, @Body() body: any) {
    const userId = Number(id);
    const images = body.images_base64 || body.images || [];
    const descriptors = body.face_descriptors || body.descriptors || [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const desc = descriptors[i] || null;
      await this.attendanceService.registerFace({
        userId,
        template: img,
        vector: desc,
      });
    }
    return {
      status: 'success',
      message: 'FaceID биометрик расмлари базага сақланди!',
    };
  }

  // ===== Standard Attendance Check-In / Check-Out =====
  @Post('attendance/check-in')
  @UseInterceptors(AnyFilesInterceptor())
  checkIn(
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Body() body: any,
  ) {
    const b: any = body || {};
    return this.attendanceService.checkIn({
      userId: b.userId ? Number(b.userId) : undefined,
      faceTemplateId: b.faceTemplateId ? Number(b.faceTemplateId) : undefined,
      branchId: b.branchId ? Number(b.branchId) : undefined,
      storeId: b.storeId ? Number(b.storeId) : undefined,
      deviceId: b.deviceId,
      similarity: b.similarity,
      payload: b.payload,
    }).then(result => res.json(result));
  }

  @Post('attendance/check-out')
  @UseInterceptors(AnyFilesInterceptor())
  checkOut(
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Body() body: any,
  ) {
    const b: any = body || {};
    return this.attendanceService.checkOut({
      userId: b.userId ? Number(b.userId) : undefined,
      faceTemplateId: b.faceTemplateId ? Number(b.faceTemplateId) : undefined,
      branchId: b.branchId ? Number(b.branchId) : undefined,
      storeId: b.storeId ? Number(b.storeId) : undefined,
      deviceId: b.deviceId,
      similarity: b.similarity,
      payload: b.payload,
    }).then(result => res.json(result));
  }

  @Post('attendance')
  createManual(@Body() body: any) {
    return this.attendanceService.createManual(body);
  }

  @Get('attendance/today')
  getToday() {
    return this.attendanceService.getTodayAttendance();
  }

  @Get('attendance/history/:employeeId')
  getHistory(@Param('employeeId') employeeId: string) {
    return this.attendanceService.getEmployeeHistory(+employeeId);
  }

  @Get('attendance')
  findAll(@Query() query: any) {
    return this.attendanceService.findAll(query);
  }

  @Get('attendance/:id')
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(+id);
  }

  @Patch('attendance/:id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.attendanceService.update(+id, body);
  }

  @Delete('attendance/:id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.attendanceService.remove(+id, req?.user?.id);
  }

  // ===== Face Registration & Management =====
  @Post('attendance/register-face')
  registerFace(@Body() body: any) {
    return this.attendanceService.registerFace(body);
  }

  @Get('attendance/faces')
  listFaces(@Query() query: any) {
    return this.attendanceService.listFaces(query);
  }

  @Delete('attendance/faces/:id')
  deleteFace(@Param('id') id: string) {
    return this.attendanceService.deleteFace(+id);
  }
}
