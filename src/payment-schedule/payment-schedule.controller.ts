import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Put,
} from '@nestjs/common';
import { PaymentScheduleService } from './payment-schedule.service';
import { Request } from 'express';
import { Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payment-schedules')
@UseGuards(JwtAuthGuard)
export class PaymentScheduleController {
  constructor(private readonly paymentScheduleService: PaymentScheduleService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentScheduleService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateData: any, @Req() req: Request) {
    const body = updateData || {};
    const paidByUserId = body.paidByUserId ?? (req as any)?.user?.id ?? null;
    const paidChannel = (body.paidChannel || 'CASH').toString();
    const paidAt = body.paidAt;
    return this.paymentScheduleService.update(+id, { ...body, paidByUserId, paidChannel, paidAt });
  }
}
