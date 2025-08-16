import { IsString, IsOptional, IsEmail, Length } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @Length(1, 200)
  fullName: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  address?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}