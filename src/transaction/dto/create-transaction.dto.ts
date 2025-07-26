import { IsInt, IsEnum, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, PaymentType } from '@prisma/client';

class TransactionItemDto {
  @IsInt()
  productId: number;

  @IsInt()
  quantity: number;

  @IsNumber()
  price: number;
}

export class CreateTransactionDto {
  @IsInt()
  userId: number;

  @IsInt()
  @IsOptional()
  customerId?: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items: TransactionItemDto[];
}