import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDailyExpenseDto {
  @IsNumber()
  @Min(0)
  amount: number; // in UZS

  @IsString()
  reason: string; // title or reason

  @IsString()
  @IsOptional()
  description?: string;
}
