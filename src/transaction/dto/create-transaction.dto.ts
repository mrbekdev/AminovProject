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

// Assume DTOs are updated: create-transaction.dto.ts (add toBranchId)
export class CreateTransactionDto {
  customer?: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address?: string;
  };
  branchId: number;
  toBranchId?: number; // Added
  items: {
    productId: number;
    quantity: number;
    price: number;
    creditMonth?: number;
  }[];
  type: string; // TransactionType
  userId: number;
  paymentType?: string; // PaymentType
  status?: string; // TransactionStatus
  total: number;
  finalTotal: number;
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