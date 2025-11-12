import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { TaskService } from './task.service';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(@Body() body: { transactionId: number; auditorId?: number | null; status?: 'PENDING' | 'ACCEPTED' | 'DELIVERED' }) {
    return this.taskService.create({
      transactionId: Number(body.transactionId),
      auditorId: body.auditorId != null ? Number(body.auditorId) : null,
      status: (body.status as any) || 'PENDING',
    } as any);
  }

  @Get()
  findAll(
    @Query('status') status?: 'PENDING' | 'ACCEPTED' | 'DELIVERED',
    @Query('auditorId') auditorId?: string,
  ) {
    const aid = auditorId != null ? Number(auditorId) : undefined;
    return this.taskService.findAll(status as any, aid);
  }

  @Get('auditor/:auditorId')
  findByAuditor(
    @Param('auditorId') auditorId: string,
    @Query('status') status?: 'PENDING' | 'ACCEPTED' | 'DELIVERED',
  ) {
    return this.taskService.findByAuditor(Number(auditorId), status as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskService.findOne(Number(id));
  }

  @Patch(':id/accept')
  accept(@Param('id') id: string, @Body() body: { auditorId?: number }) {
    return this.taskService.accept(Number(id), body?.auditorId ? Number(body.auditorId) : undefined);
  }

  @Patch(':id/deliver')
  deliver(@Param('id') id: string) {
    return this.taskService.deliver(Number(id));
  }

  // Aliases for clients that use POST instead of PATCH
  @Post(':id/accept')
  acceptPost(@Param('id') id: string, @Body() body: { auditorId?: number }) {
    return this.taskService.accept(Number(id), body?.auditorId ? Number(body.auditorId) : undefined);
  }

  @Post(':id/deliver')
  deliverPost(@Param('id') id: string) {
    return this.taskService.deliver(Number(id));
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.taskService.cancel(Number(id));
  }

  @Post(':id/cancel')
  cancelPost(@Param('id') id: string) {
    return this.taskService.cancel(Number(id));
  }
}
