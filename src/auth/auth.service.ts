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

    async login(username: string, password: string) {
        console.log(username)
        console.log(password)
        const user = await this.prisma.user.findUnique({ where: { username } });
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (user.role === 'MARKETING') {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();

            if (user.workStartTime && user.workEndTime) {
                const [startHours, startMinutes] = user.workStartTime.split(':').map(Number);
                const startTime = startHours * 60 + startMinutes;

                const [endHours, endMinutes] = user.workEndTime.split(':').map(Number);
                const endTime = endHours * 60 + endMinutes;

                if (currentTime < startTime || currentTime > endTime) {
                    throw new UnauthorizedException('You can only log in during your work hours.');
                }
            }
        }

        console.log(user);
        if (!user.password) {
            throw new UnauthorizedException('User does not have a password set');
            
        }
        const isPasswordValid = await bcrypt.compare(password, user.password); // Compare plain password with stored hash
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }
    
        const payload = { username: user.username, sub: user.id, role: user.role };
        const token = this.jwtService.sign(payload);
    
        return {
            message: 'Login successful',
            access_token: token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                branchId: user.branchId,
            },
        };
    }
} 