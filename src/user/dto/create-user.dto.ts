import { IsString, IsEnum, IsOptional, MaxLength, IsInt, IsPositive, IsArray, IsBoolean } from 'class-validator';
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

  @ApiPropertyOptional({
    example: [1, 2, 3],
    description: 'Marketing foydalanuvchilari uchun ruxsat berilgan filiallar',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  allowedBranches?: number[];

  @ApiPropertyOptional({
    example: '09:00',
    description: 'Ish boshlanish vaqti (HH:MM formatida)',
  })
  @IsOptional()
  @IsString()
  workStartTime?: string;

  @ApiPropertyOptional({
    example: '18:00',
    description: 'Ish tugash vaqti (HH:MM formatida)',
  })
  @IsOptional()
  @IsString()
  workEndTime?: string;

  @ApiPropertyOptional({
    example: 'DAY',
    description: 'Ish smenasi (DAY, NIGHT)',
  })
  @IsOptional()
  @IsString()
  workShift?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Foydalanuvchi faol yoki nofaol',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
