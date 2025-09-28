import { ApiProperty } from '@nestjs/swagger';

export class UserBranchAccessResponseDto {
  @ApiProperty({ description: 'Unique identifier of the user-branch access' })
  id: number;

  @ApiProperty({ description: 'User ID' })
  userId: number;

  @ApiProperty({ description: 'Branch ID' })
  branchId: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
