import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateDefectiveLogDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsInt()
  userId?: number;
}
