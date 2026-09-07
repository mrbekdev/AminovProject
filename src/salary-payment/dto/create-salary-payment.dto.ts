import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateSalaryPaymentDto {
  @ApiProperty({ description: 'Employee User ID receiving salary' })
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @ApiProperty({ description: 'Salary amount paid' })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Payment date (defaults to now)' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ description: 'Payment type (CASH, CARD, etc.)', default: 'CASH' })
  @IsOptional()
  @IsString()
  paymentType?: string;

  @ApiPropertyOptional({ description: 'Notes / description of payment' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsNumber()
  branchId?: number;
}
