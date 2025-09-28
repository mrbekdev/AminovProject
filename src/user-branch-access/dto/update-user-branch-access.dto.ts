import { PartialType } from '@nestjs/mapped-types';
import { CreateUserBranchAccessDto } from './create-user-branch-access.dto';

export class UpdateUserBranchAccessDto extends PartialType(CreateUserBranchAccessDto) {}
