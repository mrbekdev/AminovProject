import { IsInt, IsOptional, IsString, IsNumber } from 'class-validator';

export class CheckOutDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsInt()
  faceTemplateId?: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsNumber()
  similarity?: number; // face match score

  @IsOptional()
  payload?: any;
}
