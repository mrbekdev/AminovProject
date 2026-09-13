import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTradeInProductDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsNotEmpty()
  @IsNumber()
  costPrice: number; // Received cost/valuation price in UZS

  @IsOptional()
  @IsNumber()
  costPriceUSD?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsNotEmpty()
  @IsNumber()
  branchId: number;

  @IsOptional()
  @IsNumber()
  transactionId?: number;

  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
