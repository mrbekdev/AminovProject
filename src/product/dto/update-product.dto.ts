import { IsString, IsEnum, IsInt, IsPositive, MaxLength, IsNumber, IsOptional } from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  categoryId?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsInt()
  @IsPositive()
  branchId?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;
  @IsOptional()
  @IsNumber()
  @IsPositive()
  marketPrice?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  quantity?: number;
}