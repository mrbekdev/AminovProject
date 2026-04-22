import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DriverRatingService } from './driver-rating.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('driver-ratings')
@UseGuards(JwtAuthGuard)
export class DriverRatingController {
  constructor(private readonly driverRatingService: DriverRatingService) {}

  @Post()
  async createRating(@Body() data: {
    driverId: number;
    transactionId: number;
    rating: number;
    ratedBy: number;
    notes?: string;
  }) {
    return this.driverRatingService.createRating(data);
  }

  @Post('batch')
  async getBatchRatings(@Body() body: { driverIds: number[] }) {
    return this.driverRatingService.getBatchRatings(body.driverIds);
  }

  @Get(':driverId')
  async getDriverRating(@Param('driverId') driverId: string) {
    return this.driverRatingService.getDriverRatingSummary(Number(driverId));
  }

  @Get('transaction/:transactionId')
  async getTransactionRatings(@Param('transactionId') transactionId: string) {
    return this.driverRatingService.getTransactionRatings(Number(transactionId));
  }

  @Get('check/:transactionId/:driverId')
  async checkRating(
    @Param('transactionId') transactionId: string,
    @Param('driverId') driverId: string,
    @Query('ratedBy') ratedBy: string,
  ) {
    return this.driverRatingService.checkRating(
      Number(transactionId),
      Number(driverId),
      Number(ratedBy),
    );
  }

  @Get('unrated/list')
  async getUnratedDeliveries(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('ratedBy') ratedBy?: string,
  ) {
    return this.driverRatingService.getUnratedDeliveries({
      branchId: branchId ? Number(branchId) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      ratedBy: ratedBy ? Number(ratedBy) : undefined,
    });
  }
}
