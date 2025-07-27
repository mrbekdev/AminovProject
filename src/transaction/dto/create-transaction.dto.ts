import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsArray, IsOptional, IsString, IsInt, IsPositive, IsNumberString } from 'class-validator';
import { TransactionType, PaymentType } from '@prisma/client';

export class CreateTransactionItemDto {
  @ApiProperty()
  @IsInt()
  productId: number;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  creditMonth?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  creditPercent?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  monthlyPayment?: number;
}

export class CreateTransactionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  customerId?: number;

  @ApiProperty()
  @IsInt()
  userId: number;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiProperty()
  @IsNumber()
  total: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  finalTotal?: number;

  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @ApiProperty()
  @IsArray()
  items: CreateTransactionItemDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  remainingBalance?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  receiptId?: string;
}