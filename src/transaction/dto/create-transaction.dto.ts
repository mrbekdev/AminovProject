import { IsNumber, IsString, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType, TransactionStatus, TransactionType } from '@prisma/client';

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

export class CustomerDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phone: string;
}

export class CreateTransactionDto {
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerDto)
  customer?: CustomerDto;

  @IsString()
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

  @IsOptional()
  @IsNumber()
  branchId?: number;

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