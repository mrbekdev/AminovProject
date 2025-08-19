import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(255)
  location: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}