import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
        private prisma: PrismaService,
    ) { }

  async validateUserById(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      return user;
    } catch (error) {
      console.error('Error validating user by ID:', error.message);
      return null;
    }
  }

  async login(username: string, password: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: username }, // Use email for login
      });
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const payload = { id: user.id, username: user.email };
      const access_token = this.jwtService.sign(payload);
      return { access_token, userId: user.id }; // Return userId for localStorage
    } catch (error) {
      console.error('Error in login:', error.message);
      throw new UnauthorizedException(error.message);
    }
}
} 