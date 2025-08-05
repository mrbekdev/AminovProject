import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { LocationService } from './location.service';
import { JwtService } from '@nestjs/jwt';
import { debounce } from 'lodash';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userData?: { sub: number; role: string; name?: string; email?: string; branch?: string };
}

interface UserLocationWithUser {
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

@WebSocketGateway({
  cors: {
    origin: "*", // Frontend URLlarini qo'shing
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
@Injectable()
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('LocationGateway');
  private connectedUsers = new Map<number, string>();
  private emitOnlineUsersDebounced = debounce(this.emitOnlineUsers.bind(this), 1000);
  private emitAllLocationsDebounced = debounce(this.emitAllLocationsToAdmins.bind(this), 500);

  constructor(
    private locationService: LocationService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new UnauthorizedException('Token not provided');
      }

      const payload = this.jwtService.verify(token);
      if (typeof payload.sub !== 'number' || !payload.sub || typeof payload.role !== 'string') {
        throw new UnauthorizedException('Invalid token payload');
      }

      client.userId = payload.sub;
      client.userData = {
        sub: payload.sub,
        role: payload.role,
        name: payload.name,
        email: payload.email,
        branch: payload.branch,
      };

      if (client.userId === undefined) {
        throw new Error('userId is undefined');
      }

      this.connectedUsers.set(client.userId, client.id);
      this.logger.log(`User ${client.userId} connected: ${client.id}`);

      // User default location bilan online qilish
      await this.locationService.updateUserLocation(client.userId, {
        userId: client.userId,
        isOnline: true,
        latitude: 41.3111,
        longitude: 69.2797,
        address: 'Initial connection - Toshkent',
      });

      // Online userlar ro'yxatini yangilash
      this.emitOnlineUsersDebounced();

      // Agar admin bo'lsa, barcha online userlarning locationini yuborish
      if (client.userData?.role === 'ADMIN') {
        const onlineUsers = await this.locationService.getAllOnlineUsers();
        client.emit('adminAllLocations', onlineUsers);
        this.logger.log(`Sent adminAllLocations to admin ${client.userId}:`, onlineUsers.length + ' users');
      }

      // Client o'zining locationini olish
      const myLocation = await this.locationService.getUserLocation(client.userId);
      client.emit('myLocationUpdated', myLocation);

    } catch (error) {
      this.handleSocketError(client, error, 'Connection error');
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (typeof client.userId === 'number') {
      this.connectedUsers.delete(client.userId);
      await this.locationService.setUserOffline(client.userId);
      this.logger.log(`User ${client.userId} disconnected: ${client.id}`);
      
      // Online userlar ro'yxatini yangilash
      this.emitOnlineUsersDebounced();
      // Adminlarga yangi locationlar ro'yxatini yuborish
      this.emitAllLocationsDebounced();
    }
  }

  @SubscribeMessage('updateLocation')
  async handleLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { 
      userId?: number; 
      latitude: number; 
      longitude: number; 
      address?: string; 
      isOnline?: boolean 
    },
  ) {
    if (typeof client.userId !== 'number') {
      return this.handleSocketError(client, new UnauthorizedException('User not authenticated'), 'Authentication error');
    }

    // Agar userId berilgan bo'lsa, faqat o'z userId bilan update qilishga ruxsat berish
    if (data.userId && client.userId !== data.userId) {
      return this.handleSocketError(client, new UnauthorizedException('Cannot update other user location'), 'Authorization error');
    }

    try {
      if (!this.locationService.validateCoordinates(data.latitude, data.longitude)) {
        throw new Error('Invalid coordinates');
      }

      const updatedLocation = await this.locationService.updateUserLocation(client.userId, {
        userId: client.userId,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        isOnline: data.isOnline ?? true,
      });

      // Barcha clientlarga yangi location ma'lumotini yuborish
      this.server.emit('locationUpdated', {
        userId: client.userId,
        latitude: updatedLocation.latitude,
        longitude: updatedLocation.longitude,
        address: updatedLocation.address,
        lastSeen: updatedLocation.lastSeen,
        isOnline: updatedLocation.isOnline,
        user: updatedLocation.user,
      });

      // Adminlarga maxsus locationUpdate yuborish
      this.emitLocationToAdmins(updatedLocation);

      // Client o'ziga tasdiqlash yuborish
      client.emit('locationUpdateConfirmed', {
        success: true,
        location: updatedLocation,
      });

      // Yaqin userlarni topish va yuborish
      const nearbyUsers = await this.locationService.getNearbyUsers(client.userId, 5);
      client.emit('nearbyUsers', nearbyUsers);

      this.logger.log(`Location updated for user ${client.userId}`);

    } catch (error) {
      this.handleSocketError(client, error, 'Location update error');
    }
  }

  @SubscribeMessage('getNearbyUsers')
  async handleGetNearbyUsers(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { radius?: number },
  ) {
    if (typeof client.userId !== 'number') {
      return this.handleSocketError(client, new UnauthorizedException('User not authenticated'), 'Authentication error');
    }

    try {
      const radius = Math.min(Math.max(data.radius || 5, 0), 100);
      const nearbyUsers = await this.locationService.getNearbyUsers(client.userId, radius);
      client.emit('nearbyUsers', nearbyUsers);
      this.logger.log(`Sent nearbyUsers to user ${client.userId}: ${nearbyUsers.length} users`);
    } catch (error) {
      this.handleSocketError(client, error, 'Get nearby users error');
    }
  }

  @SubscribeMessage('getAllOnlineUsers')
  async handleGetAllOnlineUsers(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { branchId?: number },
  ) {
    if (typeof client.userId !== 'number') {
      return this.handleSocketError(client, new UnauthorizedException('User not authenticated'), 'Authentication error');
    }

    try {
      const onlineUsers = await this.locationService.getAllOnlineUsers(data.branchId);
      client.emit('onlineUsers', onlineUsers);
      this.logger.log(`Sent onlineUsers to user ${client.userId}: ${onlineUsers.length} users`);
    } catch (error) {
      this.handleSocketError(client, error, 'Get online users error');
    }
  }

  @SubscribeMessage('getUserLocation')
  async handleGetUserLocation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: number },
  ) {
    if (typeof client.userId !== 'number') {
      return this.handleSocketError(client, new UnauthorizedException('User not authenticated'), 'Authentication error');
    }

    if (client.userData?.role !== 'ADMIN') {
      return this.handleSocketError(client, new UnauthorizedException('Only admins can view specific user locations'), 'Authorization error');
    }

    try {
      const location = await this.locationService.getUserLocation(data.targetUserId);
      client.emit('userLocation', location);
      this.logger.log(`Sent userLocation for user ${data.targetUserId} to admin ${client.userId}`);
    } catch (error) {
      this.handleSocketError(client, error, 'Get user location error');
    }
  }

  @SubscribeMessage('requestAllLocations')
  async handleRequestAllLocations(@ConnectedSocket() client: AuthenticatedSocket) {
    if (typeof client.userId !== 'number') {
      return this.handleSocketError(client, new UnauthorizedException('User not authenticated'), 'Authentication error');
    }

    if (client.userData?.role !== 'ADMIN') {
      return this.handleSocketError(client, new UnauthorizedException('Only admins can view all locations'), 'Authorization error');
    }

    try {
      const onlineUsers = await this.locationService.getAllOnlineUsers();
      client.emit('adminAllLocations', onlineUsers);
      this.logger.log(`Sent adminAllLocations to admin ${client.userId}: ${onlineUsers.length} users`);
    } catch (error) {
      this.handleSocketError(client, error, 'Get all locations error');
    }
  }

  // Online userlar haqida ma'lumot yuborish
  private async emitOnlineUsers() {
    try {
      const onlineUsers = await this.locationService.getAllOnlineUsers();
      this.server.emit('onlineUsersUpdated', onlineUsers);
      this.logger.log(`Emitted onlineUsersUpdated: ${onlineUsers.length} users`);
    } catch (error) {
      this.logger.error('Emit online users error:', error);
    }
  }

  // Adminlarga barcha locationlarni yuborish
  private async emitAllLocationsToAdmins() {
    try {
      const onlineUsers = await this.locationService.getAllOnlineUsers();
      const adminSockets = this.getAdminSockets();
      
      adminSockets.forEach((socketId) => {
        this.server.to(socketId).emit('adminAllLocations', onlineUsers);
      });
      
      this.logger.log(`Emitted adminAllLocations to ${adminSockets.length} admins: ${onlineUsers.length} users`);
    } catch (error) {
      this.logger.error('Emit all locations to admins error:', error);
    }
  }

  // Adminlarga bitta user locationini yuborish
  private async emitLocationToAdmins(location: UserLocationWithUser) {
    try {
      const adminSockets = this.getAdminSockets();
      
      adminSockets.forEach((socketId) => {
        this.server.to(socketId).emit('adminLocationUpdate', location);
      });
      
      this.logger.log(`Sent adminLocationUpdate to ${adminSockets.length} admins for user ${location.userId}`);
    } catch (error) {
      this.logger.error('Emit location to admins error:', error);
    }
  }

  // Admin socketlarini topish
  private getAdminSockets(): string[] {
    return Array.from(this.connectedUsers.entries())
      .filter(([userId, socketId]) => {
        const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
        return socket?.userData?.role === 'ADMIN';
      })
      .map(([_, socketId]) => socketId);
  }

  // Xatolikni qaytarish
  private handleSocketError(client: Socket, error: any, context: string) {
    this.logger.error(`${context}:`, error);
    client.emit('error', { 
      message: error.message || 'An error occurred',
      context: context 
    });
    
    if (error instanceof UnauthorizedException) {
      client.disconnect();
    }
  }

  // Manual ravishda barcha online userlarni emit qilish (test uchun)
  async forceEmitAllLocations() {
    await this.emitAllLocationsToAdmins();
    await this.emitOnlineUsers();
  }
}