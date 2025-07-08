import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsPositive } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @ApiProperty({ description: 'Product ID' })
  @IsInt()
  productId: number;

  @ApiProperty({ description: 'User ID' })
  @IsInt()
  userId: number;

  @ApiProperty({ enum: TransactionType, description: 'Transaction type' })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: 'Quantity (positive or negative for adjustments)' })
  @IsInt()
  quantity: number;

  @ApiProperty({ description: 'Price per unit' })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ description: 'Description for stock adjustments' })
  description?: string;
}