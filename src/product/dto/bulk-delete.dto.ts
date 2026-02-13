import { IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkDeleteDto {
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  ids: number[];
}
