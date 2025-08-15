// dto/create-transaction.dto.ts
import { IsEnum, IsOptional, IsNumber, IsArray, ValidateNested, IsString, Min, Max, IsPositive } from 'class-validator';
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
  @Min(0)
  price: number; // Narx nol bo'lishi mumkin

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  creditMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  creditPercent?: number; // 0.05 = 5%

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPayment?: number; // Hisoblash uchun, client tomonidan berilmasa ham bo'ladi
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
  @Min(0) // Nol ham bo'lishi mumkin
  total: number;

  @IsNumber()
  @Min(0)
  finalTotal: number;

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerDto)
  customer?: CustomerDto;

  @IsArray({ message: 'Items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items: TransactionItemDto[];

  // Validationni service da qilish maqsadga muvofiq
}