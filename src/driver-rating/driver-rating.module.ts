import { Module } from '@nestjs/common';
import { DriverRatingService } from './driver-rating.service';
import { DriverRatingController } from './driver-rating.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DriverRatingController],
  providers: [DriverRatingService],
  exports: [DriverRatingService],
})
export class DriverRatingModule {}
