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

    async login(email: string, password: string) {
        console.log(email)
        console.log(password)
        const user = await this.prisma.user.findUnique({ where: { email: email } });
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        console.log(user);
        if (!user.password) {
            throw new UnauthorizedException('User does not have a password set');
            
        }
        const isPasswordValid = await bcrypt.compare(password, user.password); // Compare plain password with stored hash
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }
    
        const payload = { email: user.email, sub: user.id, role: user.role };
        const token = this.jwtService.sign(payload);
    
        return {
            message: 'Login successful',
            access_token: token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        };
    }
} 