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
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.paymentScheduleService.update(+id, updateData);
  }
}
