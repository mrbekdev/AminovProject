import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';
import { TransactionStatus, PaymentType } from '@prisma/client';

export class UpdateTransactionDto {
  @IsInt()
  @IsOptional()
  userId?: number;

  @IsInt()
  @IsOptional()
  branchId?: number;

  @IsInt()
  @IsOptional()
  toBranchId?: number;

  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @IsString()
  @IsOptional()
  transactionType?: string; // Qo'shimcha transaction turi

  @IsNumber()
  @IsOptional()
  total?: number;

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

  @IsString()
  @IsOptional()
  description?: string;

  // Credit repayment tracking fields
  @IsNumber()
  @IsOptional()
  creditRepaymentAmount?: number;

  @IsDateString()
  @IsOptional()
  lastRepaymentDate?: string;
}