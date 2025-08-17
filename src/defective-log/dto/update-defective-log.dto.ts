import { PartialType } from '@nestjs/mapped-types';
import { CreateDefectiveLogDto } from './create-defective-log.dto';

export class UpdateDefectiveLogDto extends PartialType(CreateDefectiveLogDto) {}
