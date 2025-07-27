import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsDateString, IsOptional, IsInt } from 'class-validator';
import { PaymentType } from '@prisma/client';

export class CreateReceiptDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  customerId?: number;

  @ApiProperty()
  @IsString()
  cashier: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty()
  items: any; // JSON type for items array

  @ApiProperty()
  @IsNumber()
  total: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  creditTotal?: number;

  @ApiProperty()
  @IsNumber()
  amountPaid: number;

  @ApiProperty()
  @IsNumber()
  remainingBalance: number;

  @ApiProperty()
  @IsString()
  returnCode: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  branchId?: number;

  @ApiProperty()
  @IsString()
  deliveryMethod: string;

  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  paymentMethod: PaymentType;
}