import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';

export class CreateWorkScheduleDto {
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'workStartTime must be in HH:MM format',
  })
  workStartTime: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'workEndTime must be in HH:MM format',
  })
  workEndTime: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
