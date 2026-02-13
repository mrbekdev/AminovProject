import { Module } from '@nestjs/common';
import { DefectiveLogService } from './defective-log.service';
import { DefectiveLogController } from './defective-log.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DefectiveLogController],
  providers: [DefectiveLogService],
  exports: [DefectiveLogService],
})
export class DefectiveLogModule {}
