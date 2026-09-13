import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ApproveTradeInProductDto {
  @IsNotEmpty()
  @IsNumber()
  sellingPrice: number; // Admin defined selling price in UZS

  @IsOptional()
  @IsNumber()
  sellingPriceUSD?: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  bonusPercentage?: number;

  @IsOptional()
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @IsString()
  months?: string;
}
