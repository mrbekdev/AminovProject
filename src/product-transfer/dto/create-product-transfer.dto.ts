import { IsInt, IsEnum, IsString, IsOptional, Min, IsDateString } from 'class-validator';
import { TransferStatus } from '@prisma/client';

export class CreateProductTransferDto {
  @IsInt()
  productId: number;

  @IsInt()
  fromBranchId: number;

  @IsInt()
  toBranchId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsDateString()
  transferDate: string;

  @IsInt()
  initiatedById: number;

  @IsEnum(TransferStatus)
  status: TransferStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateProductTransferDto {
  @IsInt()
  @IsOptional()
  productId?: number;

  @IsInt()
  @IsOptional()
  fromBranchId?: number;

  @IsInt()
  @IsOptional()
  toBranchId?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsDateString()
  @IsOptional()
  transferDate?: string;

  @IsInt()
  @IsOptional()
  initiatedById?: number;

  @IsEnum(TransferStatus)
  @IsOptional()
  status?: TransferStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}