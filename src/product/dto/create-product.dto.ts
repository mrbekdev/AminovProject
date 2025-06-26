import { IsString, IsEnum, IsInt, IsPositive, MaxLength, IsNumber, IsOptional } from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  barcode: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsInt()
  @IsPositive()
  categoryId: number;

  @IsEnum(ProductStatus)
  status: ProductStatus;

  @IsInt()
  @IsPositive()
  branchId: number;

  @IsNumber()
  @IsPositive()
  price: number;
  @IsNumber()
  @IsPositive()
  marketPrice: number;

  @IsInt()
  @IsPositive()
  quantity: number;
}