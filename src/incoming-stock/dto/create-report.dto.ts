import { IsNumber, IsString, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum IncomingReportStatusDto {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
}

export class IncomingStockItemDto {
  @IsNumber()
  productId: number;

  @IsString()
  barcode: string;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  note?: string;
}

export class CreateIncomingStockReportDto {
  @IsNumber()
  branchId: number;

  @IsString()
  @IsOptional()
  note?: string;

  @IsEnum(IncomingReportStatusDto)
  status: IncomingReportStatusDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IncomingStockItemDto)
  items: IncomingStockItemDto[];
}
