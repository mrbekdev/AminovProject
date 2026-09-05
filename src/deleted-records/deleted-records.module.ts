import { Module } from '@nestjs/common';
import { DeletedRecordsService } from './deleted-records.service';
import { DeletedRecordsController } from './deleted-records.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DeletedRecordsController],
  providers: [DeletedRecordsService],
  exports: [DeletedRecordsService],
})
export class DeletedRecordsModule {}
