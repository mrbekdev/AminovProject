import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Location')
@Controller('location')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post('update')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Update user location' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateLocation(@Request() req, @Body() updateLocationDto: UpdateLocationDto) {
    try {
      const userId = req.user.sub;
      return await this.locationService.updateUserLocation(userId, {
        ...updateLocationDto,
        userId,
      });
    } catch (error) {
      throw new HttpException(error.message || 'Failed to update location', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('my-location')
  @ApiOperation({ summary: 'Get own location' })
  @ApiResponse({ status: 200, description: 'Location found' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async getMyLocation(@Request() req) {
    try {
      const userId = req.user.sub;
      return await this.locationService.getUserLocation(userId);
    } catch (error) {
      throw new HttpException(error.message || 'Location not found', HttpStatus.NOT_FOUND);
    }
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user location (admin only)' })
  @ApiResponse({ status: 200, description: 'Location found' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async getUserLocation(@Param('userId') userId: string) {
    try {
      return await this.locationService.getUserLocation(+userId);
    } catch (error) {
      throw new HttpException(error.message || 'Location not found', HttpStatus.NOT_FOUND);
    }
  }

  @Get('online-users')
  @ApiOperation({ summary: 'Get all online users (admin only)' })
  @ApiResponse({ status: 200, description: 'List of online users' })
  async getOnlineUsers() {
    try {
      return await this.locationService.getAllOnlineUsers();
    } catch (error) {
      throw new HttpException(error.message || 'Failed to get online users', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby users' })
  @ApiQuery({ name: 'radius', required: false, description: 'Radius in kilometers (default: 5, max: 100)' })
  @ApiResponse({ status: 200, description: 'List of nearby users' })
  async getNearbyUsers(@Request() req, @Query('radius') radius?: string) {
    try {
      const userId = req.user.sub;
      const radiusKm = radius ? Math.min(parseFloat(radius), 100) : 5;
      if (isNaN(radiusKm)) {
        throw new HttpException('Invalid radius value', HttpStatus.BAD_REQUEST);
      }
      return await this.locationService.getNearbyUsers(userId, radiusKm);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to get nearby users', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('my-location')
  @ApiOperation({ summary: 'Delete own location' })
  @ApiResponse({ status: 200, description: 'Location deleted' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async deleteMyLocation(@Request() req) {
    try {
      const userId = req.user.sub;
      return await this.locationService.deleteUserLocation(userId);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to delete location', HttpStatus.BAD_REQUEST);
    }
  }

  @Put('offline')
  @ApiOperation({ summary: 'Set user offline' })
  @ApiResponse({ status: 200, description: 'Set to offline' })
  async setOffline(@Request() req) {
    try {
      const userId = req.user.sub;
      return await this.locationService.setUserOffline(userId);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to set offline', HttpStatus.BAD_REQUEST);
    }
  }
}