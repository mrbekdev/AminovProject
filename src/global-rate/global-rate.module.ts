import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GlobalRateService } from './global-rate.service';
import { GlobalRateController } from './global-rate.controller';

@Module({
  imports: [PrismaModule],
  providers: [GlobalRateService],
  controllers: [GlobalRateController],
  exports: [GlobalRateService],
})
export class GlobalRateModule {}
