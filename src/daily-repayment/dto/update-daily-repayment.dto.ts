import { PartialType } from '@nestjs/mapped-types';
import { CreateDailyRepaymentDto } from './create-daily-repayment.dto';

export class UpdateDailyRepaymentDto extends PartialType(CreateDailyRepaymentDto) {}
