import { Injectable, NotFoundException } from '@nestjs/common';
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
  constructor(private prisma: PrismaService) {}

  validateCoordinates(latitude: number, longitude: number): boolean {
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  async updateUserLocation(
    userId: number,
    data: { userId: number; latitude: number; longitude: number; address?: string; isOnline?: boolean },
  ): Promise<UserLocationWithUser> {
    if (!this.validateCoordinates(data.latitude, data.longitude)) {
      console.warn(`Invalid coordinates for user ${userId}:`, { latitude: data.latitude, longitude: data.longitude });
      throw new Error('Invalid coordinates');
    }

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
            name: true,
            email: true,
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
    console.log('Updated location for user:', userId, updatedLocation);
    return updatedLocation as unknown as UserLocationWithUser;
  }

  async getUserLocation(userId: number): Promise<UserLocationWithUser> {
    const location = await this.prisma.userLocation.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
      throw new NotFoundException(`Location for user ${userId} not found`);
    }
    console.log('Fetched location for user:', userId, location);
    return location as unknown as UserLocationWithUser;
  }

  async getAllOnlineUsers(branchId?: number): Promise<UserLocationWithUser[]> {
    const users = await this.prisma.userLocation.findMany({
      where: {
        isOnline: true,
        ...(branchId && { user: { branchId } }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
    console.log('Fetched all online users:', users);
    return users as unknown as UserLocationWithUser[];
  }

  async getNearbyUsers(userId: number, radius: number): Promise<UserLocationWithUser[]> {
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
            name: true,
            email: true,
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
        const distance = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          loc.latitude,
          loc.longitude,
        );
        if (distance <= radius) {
          return { ...(loc as unknown as UserLocationWithUser), distance };
        }
        return null;
      })
      .filter((loc): loc is UserLocationWithUser & { distance: number } => loc !== null);
    console.log('Nearby users for userId:', userId, nearbyUsers);
    return nearbyUsers;
  }

  async setUserOffline(userId: number): Promise<void> {
    try {
      await this.prisma.userLocation.update({
        where: { userId },
        data: { isOnline: false, updatedAt: new Date() },
      });
      console.log('Set user offline:', userId);
    } catch (error) {
      throw new NotFoundException(`Location for user ${userId} not found`);
    }
  }

  async deleteUserLocation(userId: number): Promise<void> {
    try {
      await this.prisma.userLocation.delete({
        where: { userId },
      });
      console.log('Deleted location for user:', userId);
    } catch (error) {
      throw new NotFoundException(`Location for user ${userId} not found`);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}