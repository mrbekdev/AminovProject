import { IsString, IsEmail, IsEnum, IsOptional, MaxLength, IsInt, IsPositive } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MaxLength(255)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsInt()
  @IsPositive()
  branchId: number;
}