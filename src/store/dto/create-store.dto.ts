import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  store_name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  radius_meters?: number;

  @IsOptional()
  @IsString()
  working_days?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsNumber()
  late_tolerance_min?: number;

  @IsOptional()
  @IsNumber()
  early_leave_tolerance_min?: number;

  @IsOptional()
  @IsNumber()
  late_penalty_per_min?: number;

  @IsOptional()
  @IsNumber()
  early_bonus_per_min?: number;

  @IsOptional()
  @IsString()
  overtime_policy?: string;

  @IsOptional()
  @IsNumber()
  face_confidence_threshold?: number;

  @IsOptional()
  @IsNumber()
  branchId?: number;
}
