import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { UserService } from 'src/user/user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
    imports: [
        UserModule,
        PassportModule,
        JwtModule.register({
            secret: 'aminov', // In production, use environment variable
            signOptions: { expiresIn: '24h' },
        }),
    ],
    providers: [AuthService, UserService, PrismaService, JwtStrategy],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule { } 