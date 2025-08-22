import { IsString, IsNumber, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';

export class CreateCurrencyExchangeRateDto {
  @IsString()
  fromCurrency: string;

  @IsString()
  toCurrency: string;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  branchId?: number;
}
