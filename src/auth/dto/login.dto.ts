import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({
        example: 'ali@example.com',
        description: 'Foydalanuvchining email manzili',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        example: 'secret123',
        description: 'Foydalanuvchi paroli',
    })
    @IsString()
    @IsNotEmpty()
    password: string;
} 