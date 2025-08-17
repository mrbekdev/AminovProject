import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateDefectiveLogDto {
  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @IsEnum(['DEFECTIVE', 'FIXED', 'RETURN', 'EXCHANGE'])
  actionType?: string;
}
