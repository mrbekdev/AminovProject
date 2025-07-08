import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class UpdateTransactionDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @IsInt()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Price per unit' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({ description: 'Description for stock adjustments' })
  @IsOptional()
  description?: string;
}