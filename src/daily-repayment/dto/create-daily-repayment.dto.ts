import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateDailyRepaymentDto {
  @IsNumber()
  transactionId: number;

  @IsNumber()
  amount: number;

  @IsString()
  channel: string;

  @IsDateString()
  paidAt: string;

  @IsNumber()
  @IsOptional()
  paidByUserId?: number;
}
