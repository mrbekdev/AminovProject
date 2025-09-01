import { PartialType } from '@nestjs/mapped-types';
import { CreateCreditRepaymentDto } from './create-credit-repayment.dto';

export class UpdateCreditRepaymentDto extends PartialType(CreateCreditRepaymentDto) {}
