import { IsInt, IsOptional, IsString, IsNumber } from 'class-validator';

export class CheckInDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsInt()
  faceTemplateId?: number; // identify user by registered face template

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
