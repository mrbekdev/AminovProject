import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, TransactionStatus, PaymentType } from '@prisma/client';

export class CreateTransactionItemDto {
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  @IsInt()
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
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class CreateTransactionDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsNumber()
  @IsNotEmpty()
  total: number;

  @IsNumber()
  @IsNotEmpty()
  finalTotal: number;

  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  @IsInt()
  @IsNotEmpty()
  branchId: number;

  @IsInt()
  @IsOptional()
  customerId?: number;

  @ValidateNested()
  @Type(() => CustomerDto)
  @IsOptional()
  customer?: CustomerDto;

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

  @ValidateNested({ each: true })
  @Type(() => CreateTransactionItemDto)
  @IsNotEmpty()
  items: CreateTransactionItemDto[];
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