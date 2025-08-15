import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, TransactionStatus, PaymentType } from '@prisma/client';

export class CreateCustomerDto {
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

export class CreateTransactionItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  creditMonth?: number;
}

export class CreateTransactionDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  customer?: CreateCustomerDto;

  @IsNumber()
  branchId: number;

  @IsOptional()
  @IsNumber()
  toBranchId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionItemDto)
  items: CreateTransactionItemDto[];

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  userId: number;

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsNumber()
  total: number;

  @IsNumber()
  finalTotal: number;

  @IsOptional()
  @IsNumber()
  creditPercent?: number; // User-provided interest rate
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  finalTotal?: number;

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsNumber()
  remainingBalance?: number;

  @IsOptional()
  @IsString()
  receiptId?: string;
}