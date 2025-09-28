import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateUserBranchAccessDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsInt()
  @IsNotEmpty()
  branchId: number;
}
