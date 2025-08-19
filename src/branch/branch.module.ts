import { Module } from '@nestjs/common';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [BranchController],
  providers: [BranchService,PrismaService],
})
export class BranchModule {}
