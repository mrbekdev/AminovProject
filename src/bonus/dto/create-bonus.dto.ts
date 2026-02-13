import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString, IsInt } from 'class-validator';

export class CreateBonusDto {
  @ApiProperty({ description: 'ID of the user receiving the bonus' })
  @IsNotEmpty()
  @IsInt()
  userId: number;

  @ApiProperty({ description: 'Bonus amount' })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Reason for the bonus' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Optional detailed description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Date when bonus was given', required: false })
  @IsOptional()
  @IsDateString()
  bonusDate?: string;

  @ApiProperty({ description: 'Branch ID where bonus was given', required: false })
  @IsOptional()
  @IsInt()
  branchId?: number;
}
