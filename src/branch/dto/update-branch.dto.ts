import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';

export enum BranchType {
  SKLAD = 'SKLAD',
  SAVDO_MARKAZ = 'SAVDO_MARKAZ'
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsEnum(BranchType)
  type?: BranchType;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}