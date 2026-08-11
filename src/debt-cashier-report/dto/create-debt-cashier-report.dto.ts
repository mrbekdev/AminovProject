import { IsNumber, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class CreateDebtCashierReportDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  cashAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  click9905Amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bankAccountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  onlineAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  terminalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  discountNote?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mibAmount?: number;

  @IsOptional()
  @IsString()
  mibNote?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  contractsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  contractsAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsInt()
  cashierId?: number;
}
