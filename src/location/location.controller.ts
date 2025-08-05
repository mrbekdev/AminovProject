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
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { LocationService, UserLocationWithUser } from './location.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Location')
@Controller('location')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationController {
  private logger = new Logger('LocationController');

  constructor(private readonly locationService: LocationService) {}

  @Post('update')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Update user location' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid coordinates or data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateLocation(@Request() req, @Body() updateLocationDto: UpdateLocationDto): Promise<{
    success: boolean;
    location: UserLocationWithUser;
    message: string;
  }> {
    try {
      const userId = req.user.sub;
      
      // Koordinatalarni tekshirish
      const latitude = typeof updateLocationDto.latitude === 'number' ? updateLocationDto.latitude : 0;
      const longitude = typeof updateLocationDto.longitude === 'number' ? updateLocationDto.longitude : 0;
      
      if (!this.locationService.validateCoordinates(latitude, longitude)) {
        throw new HttpException('Invalid coordinates provided', HttpStatus.BAD_REQUEST);
      }

      const location = await this.locationService.updateUserLocation(userId, {
        ...updateLocationDto,
        userId,
        latitude,
        longitude,
      });

      this.logger.log(`Location updated for user ${userId}`);
      
      return {
        success: true,
        location,
        message: 'Location updated successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to update location for user ${req.user?.sub}:`, error);
      throw new HttpException(
        error.message || 'Failed to update location', 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('my-location')
  @ApiOperation({ summary: 'Get current user location' })
  @ApiResponse({ status: 200, description: 'Location found successfully' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyLocation(@Request() req): Promise<{
    success: boolean;
    location: UserLocationWithUser;
    message: string;
  }> {
    try {
      const userId = req.user.sub;
      const location = await this.locationService.getUserLocation(userId);
      
      this.logger.log(`Retrieved location for user ${userId}`);
      
      return {
        success: true,
        location,
        message: 'Location retrieved successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to get location for user ${req.user?.sub}:`, error);
      
      if (error.message.includes('not found')) {
        throw new HttpException('Location not found', HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException(
        error.message || 'Failed to get location', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get specific user location (Admin only)' })
  @ApiParam({ name: 'userId', description: 'Target user ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'User location found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User location not found' })
  async getUserLocation(@Request() req, @Param('userId') userId: string): Promise<{
    success: boolean;
    location: UserLocationWithUser;
    message: string;
  }> {
    try {
      if (req.user.role !== 'ADMIN') {
        throw new ForbiddenException("Only admins can view other users' locations");
      }

      const targetUserId = parseInt(userId, 10);
      if (isNaN(targetUserId)) {
        throw new HttpException('Invalid user ID', HttpStatus.BAD_REQUEST);
      }

      const location = await this.locationService.getUserLocation(targetUserId);
      
      this.logger.log(`Admin ${req.user.sub} retrieved location for user ${targetUserId}`);
      
      return {
        success: true,
        location,
        message: 'User location retrieved successfully'
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Failed to get location for user ${userId}:`, error);
      
      if (error.message.includes('not found')) {
        throw new HttpException('User location not found', HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException(
        error.message || 'Failed to get user location', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('online-users')
  @ApiOperation({ summary: 'Get all online users (Admin only)' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filter by branch ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'List of online users retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getOnlineUsers(@Request() req, @Query('branchId') branchId?: string): Promise<{
    success: boolean;
    users: UserLocationWithUser[];
    count: number;
    message: string;
  }> {
    try {
      if (req.user.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can view all online users');
      }

      const branchIdNum = branchId ? parseInt(branchId, 10) : undefined;
      if (branchId && isNaN(branchIdNum!)) {
        throw new HttpException('Invalid branch ID', HttpStatus.BAD_REQUEST);
      }

      const users = await this.locationService.getAllOnlineUsers(branchIdNum);
      
      this.logger.log(`Admin ${req.user.sub} retrieved ${users.length} online users${branchId ? ` for branch ${branchId}` : ''}`);
      
      return {
        success: true,
        users,
        count: users.length,
        message: 'Online users retrieved successfully'
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Failed to get online users:`, error);
      throw new HttpException(
        error.message || 'Failed to get online users', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby users within specified radius' })
  @ApiQuery({ name: 'radius', required: false, description: 'Radius in kilometers (default: 5, max: 100)', type: 'number' })
  @ApiResponse({ status: 200, description: 'List of nearby users retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid radius' })
  @ApiResponse({ status: 404, description: 'User location not found' })
  async getNearbyUsers(@Request() req, @Query('radius') radius?: string): Promise<{
    success: boolean;
    users: UserLocationWithUser[];
    count: number;
    radius: number;
    message: string;
  }> {
    try {
      const userId = req.user.sub;
      
      let radiusKm = 5; // default
      if (radius) {
        radiusKm = parseFloat(radius);
        if (isNaN(radiusKm) || radiusKm < 0) {
          throw new HttpException('Invalid radius value', HttpStatus.BAD_REQUEST);
        }
        radiusKm = Math.min(radiusKm, 100); // max 100km
      }

      const users = await this.locationService.getNearbyUsers(userId, radiusKm);
      
      this.logger.log(`Retrieved ${users.length} nearby users for user ${userId} within ${radiusKm}km`);
      
      return {
        success: true,
        users,
        count: users.length,
        radius: radiusKm,
        message: 'Nearby users retrieved successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to get nearby users for user ${req.user?.sub}:`, error);
      
      if (error.message.includes('not found')) {
        throw new HttpException('Your location not found. Please update your location first.', HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException(
        error.message || 'Failed to get nearby users', 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Delete('my-location')
  @ApiOperation({ summary: 'Delete current user location' })
  @ApiResponse({ status: 200, description: 'Location deleted successfully' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async deleteMyLocation(@Request() req): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const userId = req.user.sub;
      await this.locationService.deleteUserLocation(userId);
      
      this.logger.log(`Deleted location for user ${userId}`);
      
      return {
        success: true,
        message: 'Location deleted successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to delete location for user ${req.user?.sub}:`, error);
      
      if (error.message.includes('not found')) {
        throw new HttpException('Location not found', HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException(
        error.message || 'Failed to delete location', 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Put('offline')
  @ApiOperation({ summary: 'Set current user offline' })
  @ApiResponse({ status: 200, description: 'User set to offline successfully' })
  async setOffline(@Request() req): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const userId = req.user.sub;
      await this.locationService.setUserOffline(userId);
      
      this.logger.log(`Set user ${userId} offline`);
      
      return {
        success: true,
        message: 'User set to offline successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to set user ${req.user?.sub} offline:`, error);
      throw new HttpException(
        error.message || 'Failed to set offline', 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get location statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Location statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getLocationStats(@Request() req): Promise<{
    success: boolean;
    stats: {
      totalUsers: number;
      onlineUsers: number;
      offlineUsers: number;
    };
    message: string;
  }> {
    try {
      if (req.user.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can view location statistics');
      }

      const stats = await this.locationService.getLocationStats();
      
      this.logger.log(`Admin ${req.user.sub} retrieved location statistics`);
      
      return {
        success: true,
        stats,
        message: 'Location statistics retrieved successfully'
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Failed to get location stats:`, error);
      throw new HttpException(
        error.message || 'Failed to get location statistics', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('cleanup-offline')
  @ApiOperation({ summary: 'Cleanup old offline user locations (Admin only)' })
  @ApiQuery({ name: 'hours', required: false, description: 'Remove offline locations older than X hours (default: 24)', type: 'number' })
  @ApiResponse({ status: 200, description: 'Offline locations cleaned up successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async cleanupOfflineUsers(@Request() req, @Query('hours') hours?: string): Promise<{
    success: boolean;
    deletedCount: number;
    message: string;
  }> {
    try {
      if (req.user.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can cleanup offline locations');
      }

      let hoursNum = 24; // default
      if (hours) {
        hoursNum = parseInt(hours, 10);
        if (isNaN(hoursNum) || hoursNum < 1) {
          throw new HttpException('Invalid hours value', HttpStatus.BAD_REQUEST);
        }
      }

      const deletedCount = await this.locationService.cleanupOfflineUsers(hoursNum);
      
      this.logger.log(`Admin ${req.user.sub} cleaned up ${deletedCount} offline locations older than ${hoursNum} hours`);
      
      return {
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} offline locations successfully`
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Failed to cleanup offline locations:`, error);
      throw new HttpException(
        error.message || 'Failed to cleanup offline locations', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}