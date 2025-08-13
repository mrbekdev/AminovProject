// dto/create-product.dto.ts
import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsNumber()
  branchId: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  marketPrice?: number;

  @IsOptional()
  @IsString()
  model?: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}


export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  marketPrice?: number;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class MarkDefectiveDto {
  @IsNumber()
  @Min(1)
  defectiveCount: number;
}

export class RestoreDefectiveDto {
  @IsNumber()
  @Min(1)
  restoreCount: number;
}