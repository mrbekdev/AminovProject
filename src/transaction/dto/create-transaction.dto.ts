// src/transaction/dto/create-transaction.dto.ts
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

  @IsNumber()
  total: number;

  @IsOptional()
  @IsNumber()
  creditMonth?: number;

  @IsOptional()
  @IsNumber()
  creditPercent?: number;

  @IsOptional()
  @IsNumber()
  monthlyPayment?: number;
}

export class CreateTransactionDto {
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  customer?: CreateCustomerDto;

  @IsNumber()
  userId: number;

  @IsNumber()
  branchId: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsNumber()
  total: number;

  @IsNumber()
  finalTotal: number;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionItemDto)
  items: CreateTransactionItemDto[];
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