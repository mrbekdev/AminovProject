import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { UserService } from 'src/user/user.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
    imports: [UserModule],
    providers: [AuthService,UserService,PrismaService],
    controllers: [AuthController],
})
export class AuthModule { } 