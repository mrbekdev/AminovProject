import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserLocationWithUser {
  userId: number;
  latitude: number;
  longitude: number;
  address?: string;
  isOnline: boolean;
  lastSeen: Date;
  updatedAt: Date;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    branch?: {
      id: number;
      name: string;
    };
  };
}

@Injectable()
export class LocationService {
  private logger = new Logger('LocationService');

  constructor(private prisma: PrismaService) {}

  validateCoordinates(latitude: number, longitude: number): boolean {
    const isValid = latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    if (!isValid) {
      this.logger.warn(`Invalid coordinates: lat=${latitude}, lng=${longitude}`);
    }
    return isValid;
  }

  async updateUserLocation(
    userId: number,
    data: { userId: number; latitude: number; longitude: number; address?: string; isOnline?: boolean },
  ): Promise<UserLocationWithUser> {
    if (!this.validateCoordinates(data.latitude, data.longitude)) {
      this.logger.error(`Invalid coordinates for user ${userId}:`, { 
        latitude: data.latitude, 
        longitude: data.longitude 
      });
      throw new Error('Invalid coordinates');
    }

    if (
      (Math.abs(data.latitude - 41.3111) < 0.01 && Math.abs(data.longitude - 69.2797) < 0.01) ||
      (Math.abs(data.latitude - 41.2995) < 0.01 && Math.abs(data.longitude - 69.2401) < 0.01)
    ) {
      this.logger.warn(`Default Tashkent coordinates for user ${userId}, rejecting update`);
      throw new Error('Default Tashkent coordinates are not allowed');
    }

    try {
      const updatedLocation = await this.prisma.userLocation.upsert({
        where: { userId },
        update: {
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address,
          isOnline: data.isOnline ?? true,
          lastSeen: new Date(),
          updatedAt: new Date(),
        },
        create: {
          userId,
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address,
          isOnline: data.isOnline ?? true,
          lastSeen: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              role: true,
              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Updated location for user ${userId}:`, {
        lat: updatedLocation.latitude,
        lng: updatedLocation.longitude,
        isOnline: updatedLocation.isOnline,
        address: updatedLocation.address
      });

      return updatedLocation as unknown as UserLocationWithUser;
    } catch (error) {
      this.logger.error(`Failed to update location for user ${userId}:`, error);
      throw new Error(`Failed to update location: ${error.message}`);
    }
  }

  async getUserLocation(userId: number): Promise<UserLocationWithUser> {
    try {
      const location = await this.prisma.userLocation.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              role: true,
              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!location) {
        this.logger.warn(`Location for user ${userId} not found`);
        throw new NotFoundException(`Location for user ${userId} not found`);
      }

      if (
        (Math.abs(location.latitude - 41.3111) < 0.01 && Math.abs(location.longitude - 69.2797) < 0.01) ||
        (Math.abs(location.latitude - 41.2995) < 0.01 && Math.abs(location.longitude - 69.2401) < 0.01)
      ) {
        this.logger.warn(`User ${userId} has default Tashkent coordinates`);
        throw new NotFoundException(`User ${userId} has default Tashkent coordinates`);
      }

      this.logger.log(`Fetched location for user ${userId}`);
      return location as unknown as UserLocationWithUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get location for user ${userId}:`, error);
      throw new Error(`Failed to get user location: ${error.message}`);
    }
  }

  async getAllOnlineUsers(branchId?: number): Promise<UserLocationWithUser[]> {
    try {
      const whereCondition: any = {
        isOnline: true,
      };

      if (branchId) {
        whereCondition.user = { branchId };
      }

      const users = await this.prisma.userLocation.findMany({
        where: whereCondition,
        include: {
          user: {
            select: {
              id: true,

              role: true,
              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          lastSeen: 'desc',
        },
      });

      const validUsers = users.filter(
        (user) => 
          !(
            (Math.abs(user.latitude - 41.3111) < 0.01 && Math.abs(user.longitude - 69.2797) < 0.01) ||
            (Math.abs(user.latitude - 41.2995) < 0.01 && Math.abs(user.longitude - 69.2401) < 0.01)
          )
      );

      this.logger.log(`Fetched ${validUsers.length}/${users.length} valid online users${branchId ? ` for branch ${branchId}` : ''}`);
      return validUsers as unknown as UserLocationWithUser[];
    } catch (error) {
      this.logger.error('Failed to get all online users:', error);
      throw new Error(`Failed to get online users: ${error.message}`);
    }
  }

  async getNearbyUsers(userId: number, radius: number): Promise<UserLocationWithUser[]> {
    try {
      const userLocation = await this.getUserLocation(userId);
      
      const allLocations = await this.prisma.userLocation.findMany({
        where: {
          isOnline: true,
          userId: { not: userId },
        },
        include: {
          user: {
            select: {
              id: true,
              role: true,
              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      const nearbyUsers = allLocations
        .map((loc) => {
          if (
            (Math.abs(loc.latitude - 41.3111) < 0.01 && Math.abs(loc.longitude - 69.2797) < 0.01) ||
            (Math.abs(loc.latitude - 41.2995) < 0.01 && Math.abs(loc.longitude - 69.2401) < 0.01)
          ) {
            return null;
          }
          const distance = this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            loc.latitude,
            loc.longitude,
          );
          if (distance <= radius) {
            return { 
              ...(loc as unknown as UserLocationWithUser), 
              distance: Math.round(distance * 100) / 100
            };
          }
          return null;
        })
        .filter((loc): loc is UserLocationWithUser & { distance: number } => loc !== null)
        .sort((a, b) => a.distance - b.distance);

      this.logger.log(`Found ${nearbyUsers.length} nearby users for user ${userId} within ${radius}km`);
      return nearbyUsers;
    } catch (error) {
      this.logger.error(`Failed to get nearby users for user ${userId}:`, error);
      throw new Error(`Failed to get nearby users: ${error.message}`);
    }
  }

  async setUserOffline(userId: number): Promise<void> {
    try {
      const result = await this.prisma.userLocation.updateMany({
        where: { userId },
        data: { 
          isOnline: false, 
          lastSeen: new Date(),
          updatedAt: new Date() 
        },
      });

      if (result.count === 0) {
        this.logger.warn(`No location record found for user ${userId} to set offline`);
        return;
      }

      this.logger.log(`Set user ${userId} offline`);
    } catch (error) {
      this.logger.error(`Failed to set user ${userId} offline:`, error);
    }
  }

  async deleteUserLocation(userId: number): Promise<void> {
    try {
      await this.prisma.userLocation.delete({
        where: { userId },
      });
      this.logger.log(`Deleted location for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete location for user ${userId}:`, error);
      throw new NotFoundException(`Location for user ${userId} not found`);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async getLocationStats(): Promise<{
    totalUsers: number;
    onlineUsers: number;
    offlineUsers: number;
  }> {
    try {
      const totalUsers = await this.prisma.userLocation.count();
      const onlineUsers = await this.prisma.userLocation.count({
        where: { isOnline: true }
      });
      
      const stats = {
        totalUsers,
        onlineUsers,
        offlineUsers: totalUsers - onlineUsers
      };
      
      this.logger.log('Location stats:', stats);
      return stats;
    } catch (error) {
      this.logger.error('Failed to get location stats:', error);
      throw new Error('Failed to get location statistics');
    }
  }

  async cleanupOfflineUsers(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

      const result = await this.prisma.userLocation.deleteMany({
        where: {
          isOnline: false,
          lastSeen: {
            lt: cutoffDate
          }
        }
      });

      this.logger.log(`Cleaned up ${result.count} offline user locations older than ${olderThanHours} hours`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup offline users:', error);
      throw new Error('Failed to cleanup offline users');
    }
  }
}