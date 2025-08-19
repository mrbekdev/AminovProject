// src/location/location.module.ts
import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { LocationGateway } from './logation.gatewey';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [LocationController],
  providers: [LocationService, LocationGateway, PrismaService],
  exports: [LocationService],
})
export class LocationModule { }