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

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/location',
})
@Injectable()
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('LocationGateway');
  private connectedUsers = new Map<number, string>(); // userId -> socketId
  private emitOnlineUsersDebounced = debounce(this.emitOnlineUsers.bind(this), 1000);

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

      await this.locationService.updateUserLocation(client.userId, {
        userId: client.userId,
        isOnline: true,
        latitude: 0,
        longitude: 0,
      });

      this.emitOnlineUsersDebounced();

      // Send all current locations to admin on connection
      if (client.userData?.role === 'ADMIN') {
        const onlineUsers = await this.locationService.getAllOnlineUsers();
        client.emit('adminAllLocations', onlineUsers);
      }
    } catch (error) {
      this.handleSocketError(client, error, 'Connection error');
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (typeof client.userId === 'number') {
      this.connectedUsers.delete(client.userId);
      await this.locationService.setUserOffline(client.userId);
      this.logger.log(`User ${client.userId} disconnected: ${client.id}`);
      this.emitOnlineUsersDebounced();
    }
  }

  @SubscribeMessage('updateLocation')
  async handleLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { latitude: number; longitude: number; address?: string },
  ) {
    if (typeof client.userId !== 'number') {
      return this.handleSocketError(client, new UnauthorizedException('User not authenticated'), 'Authentication error');
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
        isOnline: true,
      });

      this.server.emit('locationUpdated', {
        userId: client.userId,
        latitude: updatedLocation.latitude,
        longitude: updatedLocation.longitude,
        address: updatedLocation.address,
        lastSeen: updatedLocation.lastSeen,
        user: updatedLocation.user,
      });

      // Notify admins with detailed user info
      if (client.userData?.role !== 'ADMIN') {
        this.emitLocationToAdmins({
          ...updatedLocation,
          user: {
            id: client.userId,
            name: client.userData?.name,
            email: client.userData?.email,
            role: client.userData?.role,
            branch: client.userData?.branch,
          },
        });
      }

      client.emit('locationUpdateConfirmed', {
        success: true,
        location: updatedLocation,
      });

      const nearbyUsers = await this.locationService.getNearbyUsers(client.userId, 5);
      client.emit('nearbyUsers', nearbyUsers);
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
    } catch (error) {
      this.handleSocketError(client, error, 'Get nearby users error');
    }
  }

  @SubscribeMessage('getAllOnlineUsers')
  async handleGetAllOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    if (typeof client.userId !== 'number') {
      return this.handleSocketError(client, new UnauthorizedException('User not authenticated'), 'Authentication error');
    }

    try {
      const onlineUsers = await this.locationService.getAllOnlineUsers();
      client.emit('onlineUsers', onlineUsers);
    } catch (error) {
      this.handleSocketError(client, error, 'Get online users error');
    }
  }

  private async emitOnlineUsers() {
    try {
      const onlineUsers = await this.locationService.getAllOnlineUsers();
      this.server.emit('onlineUsersUpdated', onlineUsers);
    } catch (error) {
      this.logger.error('Emit online users error:', error);
    }
  }

  private async emitLocationToAdmins(location: any) {
    const adminSockets = Array.from(this.connectedUsers.entries())
      .filter(([_, socketId]) => {
        const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
        return socket?.userData?.role === 'ADMIN';
      })
      .map(([_, socketId]) => socketId);

    adminSockets.forEach((socketId) => {
      this.server.to(socketId).emit('adminLocationUpdate', location);
    });
  }

  private handleSocketError(client: Socket, error: any, context: string) {
    this.logger.error(`${context}:`, error);
    client.emit('error', { message: error.message || 'An error occurred' });
    if (error instanceof UnauthorizedException) {
      client.disconnect();
    }
  }
}