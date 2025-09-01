import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateCreditRepaymentDto {
  @IsNumber()
  transactionId: number;

  @IsNumber()
  @IsOptional()
  scheduleId?: number;

  @IsNumber()
  amount: number;

  @IsString()
  channel: string;

  @IsString()
  @IsOptional()
  month?: string;

  @IsDateString()
  paidAt: string;

  @IsNumber()
  @IsOptional()
  paidByUserId?: number;
}
