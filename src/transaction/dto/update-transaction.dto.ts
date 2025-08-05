
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsEnum, IsString, IsArray } from 'class-validator';
import { TransactionType, PaymentType } from '@prisma/client';
import { TransactionItemDto } from './create-transaction.dto';

export class UpdateTransactionDto {
  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  customerId?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiProperty({ enum: TransactionType, required: false })
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @ApiProperty({ type: [TransactionItemDto], required: false })
  @IsArray()
  @IsOptional()
  items?: TransactionItemDto[];

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  total?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  finalTotal?: number;

  @ApiProperty({ enum: PaymentType, required: false })
  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  deliveryMethod?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  amountPaid?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  remainingBalance?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  receiptId?: string;
}
