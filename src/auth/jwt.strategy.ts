import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'aminov',
        });
    }

    async validate(payload: any) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: {
                branch: true,
                allowedBranches: {
                    include: {
                        branch: true
                    }
                }
            }
        });

        if (!user || user.status === 'DELETED') {
            throw new UnauthorizedException('User not found');
        }

        if (user.role === 'MARKETING') {
            const now = new Date();
            const minutesUtc = now.getUTCHours() * 60 + now.getUTCMinutes();
            const currentTime = (minutesUtc + 5 * 60) % (24 * 60);

            let startTimeStr = user.workStartTime;
            let endTimeStr = user.workEndTime;

            if (!startTimeStr || !endTimeStr) {
                const defaultSchedule = await (this.prisma as any).workSchedule.findFirst({ where: { isDefault: true } });
                if (defaultSchedule?.workStartTime && defaultSchedule?.workEndTime) {
                    startTimeStr = defaultSchedule.workStartTime;
                    endTimeStr = defaultSchedule.workEndTime;
                }
            }

            if (startTimeStr && endTimeStr) {
                const [startHours, startMinutes] = String(startTimeStr).split(':').map((n) => parseInt(n, 10) || 0);
                const startTime = startHours * 60 + startMinutes;

                const [endHours, endMinutes] = String(endTimeStr).split(':').map((n) => parseInt(n, 10) || 0);
                const endTime = endHours * 60 + endMinutes;

                let isWithin = false;
                if (startTime <= endTime) {
                    isWithin = currentTime >= startTime && currentTime <= endTime;
                } else {
                    isWithin = currentTime >= startTime || currentTime <= endTime;
                }

                if (!isWithin) {
                    throw new UnauthorizedException('You can only access this resource during your work hours.');
                }
            }
        }

        return {
            id: user.id,
            userId: user.id,
            username: user.username,
            role: user.role,
            branchId: user.branchId,
            branch: user.branch,
            allowedBranches: user.allowedBranches,
        };
    }
}