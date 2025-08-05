
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsEnum, IsString, IsArray, IsNotEmpty } from 'class-validator';
import { TransactionType, PaymentType } from '@prisma/client';

export class TransactionItemDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  productId: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  creditMonth?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  creditPercent?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  monthlyPayment?: number;
}

export class CreateTransactionDto {
  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  customerId?: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiProperty({ type: [TransactionItemDto] })
  @IsArray()
  @IsNotEmpty()
  items: TransactionItemDto[];

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  total: number;

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
