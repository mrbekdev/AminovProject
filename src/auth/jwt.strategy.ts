// jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your_jwt_secret',
    });
  }

  async validate(payload: any) {
    console.log('JWT Payload:', payload);
    if (!payload.id) {
      console.error('JWT validation failed: No user ID in payload');
      throw new UnauthorizedException('Invalid token: User ID not found');
    }
    const user = await this.authService.validateUserById(payload.id);
    if (!user) {
      console.error('JWT validation failed: User not found for ID:', payload.id);
      throw new UnauthorizedException('Invalid token: User not found');
    }
    return { id: user.id, username: user.email };
  }
}