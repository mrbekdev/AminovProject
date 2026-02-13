import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDailyExpenseDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number; // in UZS

  @IsString()
  @IsOptional()
  reason?: string; // title or reason

  @IsString()
  @IsOptional()
  description?: string;
}
