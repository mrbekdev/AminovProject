import { PartialType } from '@nestjs/swagger';
import { CreateSalaryPaymentDto } from './create-salary-payment.dto';

export class UpdateSalaryPaymentDto extends PartialType(CreateSalaryPaymentDto) {}
