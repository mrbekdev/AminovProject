
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsNotEmpty, IsEnum, IsDateString } from 'class-validator';
import { PaymentType } from '@prisma/client';

export class CreateReceiptDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  customerId?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cashier: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty()
  @IsNotEmpty()
  items: object; // JSON type

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  total: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  creditTotal?: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  amountPaid: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  remainingBalance: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  returnCode: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  branchId?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  deliveryMethod: string;

  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  @IsNotEmpty()
  paymentMethod: PaymentType;
}
