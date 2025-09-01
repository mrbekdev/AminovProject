import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateCreditRepaymentDto {
  @IsNumber()
  transactionId: number;

  @IsOptional()
  @IsNumber()
  scheduleId?: number;

  @IsNumber()
  amount: number;

  @IsString()
  channel: string;

  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsNumber()
  monthNumber?: number;

  @IsDateString()
  paidAt: string;

  @IsOptional()
  @IsNumber()
  paidByUserId?: number;

  @IsOptional()
  @IsNumber()
  branchId?: number;
}
