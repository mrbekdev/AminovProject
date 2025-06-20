import { IsString, IsOptional, MaxLength, IsInt, IsPositive } from 'class-validator';

export class CreateCategoryDto {
    @IsString()
    @MaxLength(100)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string;

    @IsInt()
    @IsPositive()
    branchId: number;

}