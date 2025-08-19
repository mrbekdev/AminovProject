import { IsString, IsEnum, IsOptional, MaxLength, IsInt, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    example: 'Ali Valiyev',
    description: 'Foydalanuvchining to‘liq ismi',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  firstName: string;
  @IsString()
  @MaxLength(100)
  lastName: string;
  @ApiProperty({
    example: 'johndoe',
    description: 'Foydalanuvchi username (unique)',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  username: string;

  @ApiProperty({
    example: 'secret123',
    description: 'Foydalanuvchi paroli',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  password: string;

  @ApiPropertyOptional({
    example: '+998901234567',
    description: 'Telefon raqami (ixtiyoriy)',
    maxLength: 20,
  })
  
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.ADMIN,
    description: 'Foydalanuvchi roli (enum)',
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    example: 1,
    description: 'Foydalanuvchi bog‘langan filial (branch) ID raqami',
  })


  @IsInt()
  @IsPositive()
  branchId: number;
}
