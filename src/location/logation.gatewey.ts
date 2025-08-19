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
import { LocationService, UserLocationWithUser } from './location.service';
import { JwtService } from '@nestjs/jwt';
import { debounce } from 'lodash';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userData?: { sub: number; role: string; name?: string; username?: string; branch?: string };
}

@WebSocketGateway({
  cors: {
    origin: '*',
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

  private isTashkentLocation(latitude: number, longitude: number, address?: string): boolean {
    return (
      (Math.abs(latitude - 41.3111) < 0.01 && Math.abs(longitude - 69.2797) < 0.01) ||
      (Math.abs(latitude - 41.2995) < 0.01 && Math.abs(longitude - 69.2401) < 0.01) ||
      address === 'Initial connection - Tashkent'
    );
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new UnauthorizedException('Token not provided');
      }

      let payload;
      try {
        payload = this.jwtService.verify(token);
      } catch (error) {
        throw new UnauthorizedException('Invalid token');
      }

      if (typeof payload.sub !== 'number' || !payload.sub || typeof payload.role !== 'string') {
        throw new UnauthorizedException('Invalid token payload');
      }

      client.userId = payload.sub as number;
      client.userData = {
        sub: payload.sub,
        role: payload.role,
        name: payload.name,
        username: payload.username,
        branch: payload.branch,
      };

      this.connectedUsers.set(client.userId, client.id);
      this.logger.log(`User ${client.userId} (${payload.role}) connected: ${client.id}`);

      this.emitOnlineUsersDebounced();

      if (client.userData?.role === 'ADMIN') {
        const onlineUsers = await this.locationService.getAllOnlineUsers();
        const validUsers = onlineUsers.filter(
          (user) => !this.isTashkentLocation(user.latitude, user.longitude, user.address),
        );
        client.emit('adminAllLocations', validUsers);
        this.logger.log(`Sent adminAllLocations to admin ${client.userId}: ${validUsers.length} users`);
      }

      const myLocation = await this.locationService.getUserLocation(client.userId);
      client.emit('myLocationUpdated', myLocation);

      client.emit('connectionSuccess', {
        userId: client.userId,
        role: client.userData.role,
        message: 'Successfully connected to location service',
      });

    } catch (error) {
      this.handleSocketError(client, error, 'Connection error');
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (typeof client.userId === 'number') {
      try {
        this.connectedUsers.delete(client.userId);
        await this.locationService.setUserOffline(client.userId);
        this.logger.log(`User ${client.userId} disconnected: ${client.id}`);

        this.emitOnlineUsersDebounced();
        this.emitAllLocationsDebounced();
      } catch (error) {
        this.logger.error(`Error during disconnect for user ${client.userId}:`, error);
      }
    }
  }

  @SubscribeMessage('updateLocation')
  async handleLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId?: number; latitude: number; longitude: number; address?: string; isOnline?: boolean },
  ) {
    if (typeof client.userId !== 'number') {
      return this.handleSocketError(client, new UnauthorizedException('User not authenticated'), 'Authentication error');
    }

    if (data.userId && client.userId !== data.userId) {
      return this.handleSocketError(client, new UnauthorizedException('Cannot update other user location'), 'Authorization error');
    }

    try {
      if (!this.isValidCoordinate(data.latitude) || !this.isValidCoordinate(data.longitude)) {
        throw new Error(`Invalid coordinates: lat=${data.latitude}, lng=${data.longitude}`);
      }

      if (!this.locationService.validateCoordinates(data.latitude, data.longitude)) {
        throw new Error('Coordinates out of valid range');
      }

      if (this.isTashkentLocation(data.latitude, data.longitude, data.address)) {
        throw new Error('Default Tashkent coordinates are not allowed');
      }

      this.logger.log(`Received updateLocation for user ${client.userId}:`, {
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        timestamp: new Date().toISOString(),
      });

      const updatedLocation = await this.locationService.updateUserLocation(client.userId, {
        userId: client.userId,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address || 'Updated location',
        isOnline: data.isOnline ?? true,
      });

      this.server.emit('locationUpdated', {
        userId: client.userId,
        latitude: updatedLocation.latitude,
        longitude: updatedLocation.longitude,
        address: updatedLocation.address,
        lastSeen: updatedLocation.lastSeen,
        isOnline: updatedLocation.isOnline,
        user: updatedLocation.user,
      });

      await this.emitLocationToAdmins(updatedLocation);

      client.emit('locationUpdateConfirmed', {
        success: true,
        location: updatedLocation,
        timestamp: new Date(),
      });

      try {
        const nearbyUsers = await this.locationService.getNearbyUsers(client.userId, 5);
        client.emit('nearbyUsers', nearbyUsers);
      } catch (nearbyError) {
        this.logger.warn(`Failed to get nearby users for ${client.userId}:`, nearbyError);
      }

      this.logger.log(`Location updated for user ${client.userId}: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`);
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
      const radius = Math.min(Math.max(data.radius || 5, 0.1), 100);
      const nearbyUsers = await this.locationService.getNearbyUsers(client.userId, radius);
      client.emit('nearbyUsers', nearbyUsers);
      this.logger.log(`Sent nearbyUsers to user ${client.userId}: ${nearbyUsers.length} users within ${radius}km`);
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
      const branchId = data?.branchId ? parseInt(data.branchId.toString(), 10) : undefined;
      if (branchId !== undefined && (isNaN(branchId) || branchId < 1)) {
        throw new Error('Invalid branchId');
      }

      const onlineUsers = await this.locationService.getAllOnlineUsers(branchId);
      const validUsers = onlineUsers.filter(
        (user) => !this.isTashkentLocation(user.latitude, user.longitude, user.address),
      );

      client.emit('onlineUsers', validUsers);
      this.logger.log(`Sent onlineUsers to user ${client.userId}: ${validUsers.length}/${onlineUsers.length} valid users${branchId ? ` for branch ${branchId}` : ''}`);
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
      const targetUserId = parseInt(data.targetUserId.toString(), 10);
      if (isNaN(targetUserId) || targetUserId < 1) {
        throw new Error('Invalid target user ID');
      }

      const location = await this.locationService.getUserLocation(targetUserId);
      if (this.isTashkentLocation(location.latitude, location.longitude, location.address)) {
        throw new Error('User has default Tashkent coordinates');
      }

      client.emit('userLocation', location);
      this.logger.log(`Sent userLocation for user ${targetUserId} to admin ${client.userId}`);
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
      const validLocations = onlineUsers.filter(
        (user) => !this.isTashkentLocation(user.latitude, user.longitude, user.address),
      );

      client.emit('adminAllLocations', validLocations);
      this.logger.log(`Sent adminAllLocations to admin ${client.userId}: ${validLocations.length}/${onlineUsers.length} valid locations`);
    } catch (error) {
      this.handleSocketError(client, error, 'Get all locations error');
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('pong', {
      timestamp: new Date(),
      userId: client.userId,
      connected: true,
    });
  }

  private async emitOnlineUsers() {
    try {
      const onlineUsers = await this.locationService.getAllOnlineUsers();
      const validUsers = onlineUsers.filter(
        (user) => !this.isTashkentLocation(user.latitude, user.longitude, user.address),
      );

      this.server.emit('onlineUsersUpdated', validUsers);
      this.logger.log(`Emitted onlineUsersUpdated: ${validUsers.length}/${onlineUsers.length} valid users`);
    } catch (error) {
      this.logger.error('Emit online users error:', error);
    }
  }

  private async emitAllLocationsToAdmins() {
    try {
      const onlineUsers = await this.locationService.getAllOnlineUsers();
      const validLocations = onlineUsers.filter(
        (user) => !this.isTashkentLocation(user.latitude, user.longitude, user.address),
      );

      const adminSockets = this.getAdminSockets();

      adminSockets.forEach((socketId) => {
        this.server.to(socketId).emit('adminAllLocations', validLocations);
      });

      this.logger.log(`Emitted adminAllLocations to ${adminSockets.length} admins: ${validLocations.length}/${onlineUsers.length} valid locations`);
    } catch (error) {
      this.logger.error('Emit all locations to admins error:', error);
    }
  }

  private async emitLocationToAdmins(location: UserLocationWithUser) {
    try {
      if (!this.isValidCoordinate(location.latitude) || !this.isValidCoordinate(location.longitude)) {
        this.logger.warn(`Skipping emit to admins for invalid coordinates: ${location.latitude}, ${location.longitude}`);
        return;
      }

      if (this.isTashkentLocation(location.latitude, location.longitude, location.address)) {
        this.logger.warn(`Skipping emit to admins for Tashkent location: user ${location.userId}`);
        return;
      }

      const adminSockets = this.getAdminSockets();

      adminSockets.forEach((socketId) => {
        this.server.to(socketId).emit('adminLocationUpdate', location);
      });

      this.logger.log(`Sent adminLocationUpdate to ${adminSockets.length} admins for user ${location.userId}`);
    } catch (error) {
      this.logger.error('Emit location to admins error:', error);
    }
  }

  private getAdminSockets(): string[] {
    return Array.from(this.connectedUsers.entries())
      .filter(([_, socketId]) => {
        const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
        return socket?.userData?.role === 'ADMIN';
      })
      .map(([_, socketId]) => socketId);
  }

  private handleSocketError(client: Socket, error: any, context: string) {
    this.logger.error(`${context} for client ${client.id}:`, error);

    client.emit('error', {
      message: error.message || 'An error occurred',
      context: context,
      timestamp: new Date(),
    });

    if (error instanceof UnauthorizedException) {
      this.logger.warn(`Disconnecting unauthorized client: ${client.id}`);
      client.disconnect();
    }
  }

  private isValidCoordinate(coord: number): boolean {
    return typeof coord === 'number' && !isNaN(coord) && isFinite(coord) && coord !== 0;
  }

  async forceEmitAllLocations() {
    await this.emitAllLocationsToAdmins();
    await this.emitOnlineUsers();
  }

  async broadcastLocationUpdate(location: UserLocationWithUser) {
    if (this.isValidCoordinate(location.latitude) && this.isValidCoordinate(location.longitude) &&
        !this.isTashkentLocation(location.latitude, location.longitude, location.address)) {
      this.server.emit('locationUpdated', location);
      await this.emitLocationToAdmins(location);
    }
  }

  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  getConnectedAdminsCount(): number {
    return this.getAdminSockets().length;
  }
}