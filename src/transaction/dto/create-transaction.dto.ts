import { IsEnum, IsOptional, IsNumber, IsArray, ValidateNested, IsString, IsPositive, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStatus, PaymentType, TransactionType } from '@prisma/client';

export class CustomerDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class TransactionItemDto {
  @IsNumber()
  @IsPositive()
  productId: number;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  creditMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  creditPercent?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  monthlyPayment?: number;
}

export class CreateTransactionDto {
  @IsNumber()
  @IsPositive()
  userId: number;

  @IsNumber()
  @IsPositive()
  branchId: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  toBranchId?: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsNumber()
  @IsPositive()
  total: number;

  @IsNumber()
  @IsPositive()
  finalTotal: number;

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerDto)
  customer?: CustomerDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items: TransactionItemDto[];
}