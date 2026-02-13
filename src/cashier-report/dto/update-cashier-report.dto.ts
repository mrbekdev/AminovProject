import { PartialType } from '@nestjs/mapped-types';
import { CreateCashierReportDto } from './create-cashier-report.dto';

export class UpdateCashierReportDto extends PartialType(CreateCashierReportDto) {}
