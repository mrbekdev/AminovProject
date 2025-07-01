import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationService {
  constructor(private prisma: PrismaService) {}

  async updateUserLocation(userId: number, locationDto: UpdateLocationDto) {
    if (!this.validateUserId(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const existingLocation = await this.prisma.userLocation.findUnique({
      where: { userId },
    });

    const locationData = {
      ...locationDto,
      latitude: locationDto.latitude ?? 0,
      longitude: locationDto.longitude ?? 0,
      lastSeen: new Date(),
      updatedAt: new Date(),
      isOnline: locationDto.isOnline ?? true,
    };

    if (!this.validateCoordinates(locationData.latitude, locationData.longitude)) {
      throw new BadRequestException('Invalid coordinates');
    }

    if (existingLocation) {
      return this.prisma.userLocation.update({
        where: { userId },
        data: locationData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              branch: true,
            },
          },
        },
      });
    } else {
      return this.prisma.userLocation.create({
        data: {
          userId,
          ...locationData,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              branch: true,
            },
          },
        },
      });
    }
  }

  async getUserLocation(userId: number) {
    if (!this.validateUserId(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const location = await this.prisma.userLocation.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            branch: true,
          },
        },
      },
    });

    if (!location) {
      throw new BadRequestException('Location not found');
    }
    return location;
  }

  async getAllOnlineUsers() {
    return this.prisma.userLocation.findMany({
      where: {
        isOnline: true,
        lastSeen: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            branch: true,
          },
        },
      },
      orderBy: { lastSeen: 'desc' },
    });
  }

  async setUserOffline(userId: number) {
    if (!this.validateUserId(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const location = await this.prisma.userLocation.findUnique({
      where: { userId },
    });

    if (!location) {
      throw new BadRequestException('Location not found');
    }

    return this.prisma.userLocation.update({
      where: { userId },
      data: {
        isOnline: false,
        lastSeen: new Date(),
      },
    });
  }

  async deleteUserLocation(userId: number) {
    if (!this.validateUserId(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const location = await this.prisma.userLocation.findUnique({
      where: { userId },
    });

    if (!location) {
      throw new BadRequestException('Location not found');
    }

    return this.prisma.userLocation.delete({
      where: { userId },
    });
  }

  async getNearbyUsers(userId: number, radiusKm: number = 5) {
    if (!this.validateUserId(userId)) {
      throw new BadRequestException('Invalid userId');
    }
    if (radiusKm <= 0 || radiusKm > 100) {
      throw new BadRequestException('Radius must be between 0 and 100 km');
    }

    const userLocation = await this.getUserLocation(userId);
    if (!userLocation) {
      throw new BadRequestException('User location not found');
    }

    const allUsers = await this.getAllOnlineUsers();

    return allUsers
      .filter((location) => {
        if (location.userId === userId) return false;
        const distance = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          location.latitude,
          location.longitude,
        );
        return distance <= radiusKm;
      })
      .map((location) => ({
        ...location,
        distance: this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          location.latitude,
          location.longitude,
        ),
      }));
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    );
  }

  private validateUserId(userId: number): boolean {
    return userId !== undefined && userId !== null && !isNaN(userId) && userId > 0;
  }
}