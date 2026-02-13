import { Module } from '@nestjs/common';
import { UserBranchAccessService } from './user-branch-access.service';
import { UserBranchAccessController } from './user-branch-access.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserBranchAccessController],
  providers: [UserBranchAccessService],
  exports: [UserBranchAccessService],
})
export class UserBranchAccessModule {}
