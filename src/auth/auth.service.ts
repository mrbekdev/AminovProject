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

        // Time-based login restriction for MARKETING users
        if (user.role === 'MARKETING') {
            // Compute Asia/Tashkent time using UTC+5 to avoid Intl timezone dependency
            const now = new Date();
            const minutesUtc = now.getUTCHours() * 60 + now.getUTCMinutes();
            const minutesTashkent = (minutesUtc + 5 * 60) % (24 * 60);

            // 1) Prefer default WorkSchedule window if present
            const defaultSchedule = await (this.prisma as any).workSchedule.findFirst({ where: { isDefault: true } });

            let startTime: number | null = null;
            let endTime: number | null = null;

            if (defaultSchedule?.workStartTime && defaultSchedule?.workEndTime) {
                const [sH, sM] = String(defaultSchedule.workStartTime).split(':').map((n) => parseInt(n, 10) || 0);
                const [eH, eM] = String(defaultSchedule.workEndTime).split(':').map((n) => parseInt(n, 10) || 0);
                startTime = sH * 60 + sM;
                endTime = eH * 60 + eM;
            } else if (user.workStartTime && user.workEndTime) {
                // 2) Fallback to user-specific schedule if default not set
                const [sH, sM] = String(user.workStartTime).split(':').map((n) => parseInt(n, 10) || 0);
                const [eH, eM] = String(user.workEndTime).split(':').map((n) => parseInt(n, 10) || 0);
                startTime = sH * 60 + sM;
                endTime = eH * 60 + eM;
            }

            if (startTime !== null && endTime !== null) {
                // Handle same-day (start < end) and overnight (start > end) windows
                let isWithin = false;
                if (startTime <= endTime) {
                    // Same-day window, e.g., 08:00-20:00
                    isWithin = minutesTashkent >= startTime && minutesTashkent <= endTime;
                } else {
                    // Overnight window, e.g., 20:00-08:00
                    isWithin = minutesTashkent >= startTime || minutesTashkent <= endTime;
                }
                if (!isWithin) {
                    throw new UnauthorizedException('Ish vaqti tugagan');
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