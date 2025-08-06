import { IsEnum, IsNumber, IsOptional, IsString, IsInt, IsArray, IsDateString } from 'class-validator';
import { TransactionType, TransactionStatus, PaymentType } from '@prisma/client';

export class CreateTransactionDto {
  @IsInt()
  @IsOptional()
  customerId?: number;

  @IsInt()
  userId: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @IsArray()
  items: CreateTransactionItemDto[];

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsNumber()
  total: number;

  @IsNumber()
  @IsOptional()
  finalTotal?: number;

  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  @IsString()
  @IsOptional()
  deliveryMethod?: string;

  @IsNumber()
  @IsOptional()
  amountPaid?: number;

  @IsNumber()
  @IsOptional()
  remainingBalance?: number;

  @IsString()
  @IsOptional()
  receiptId?: string;
}

export class CreateTransactionItemDto {
  @IsInt()
  productId: number;

  @IsInt()
  quantity: number;

  @IsNumber()
  price: number;

  @IsNumber()
  total: number;

  @IsInt()
  @IsOptional()
  creditMonth?: number;

  @IsNumber()
  @IsOptional()
  creditPercent?: number;

  @IsNumber()
  @IsOptional()
  monthlyPayment?: number;
}

export class UpdateTransactionDto {
  @IsInt()
  @IsOptional()
  customerId?: number;

  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsNumber()
  @IsOptional()
  finalTotal?: number;

  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  @IsString()
  @IsOptional()
  deliveryMethod?: string;

  @IsNumber()
  @IsOptional()
  amountPaid?: number;

  @IsNumber()
  @IsOptional()
  remainingBalance?: number;

  @IsString()
  @IsOptional()
  receiptId?: string;
}