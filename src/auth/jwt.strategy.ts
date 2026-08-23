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
            const currentTime = now.getHours() * 60 + now.getMinutes();

            if (user.workStartTime && user.workEndTime) {
                const [startHours, startMinutes] = user.workStartTime.split(':').map(Number);
                const startTime = startHours * 60 + startMinutes;

                const [endHours, endMinutes] = user.workEndTime.split(':').map(Number);
                const endTime = endHours * 60 + endMinutes;

                if (currentTime < startTime || currentTime > endTime) {
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