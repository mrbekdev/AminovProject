import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @ApiOperation({ summary: 'Foydalanuvchi tizimga kirish' })
    @ApiResponse({ status: 200, description: 'Muvaffaqiyatli kirish' })
    @ApiResponse({ status: 401, description: 'Noto\'g\'ri ma\'lumotlar' })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto.username, loginDto.password);
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Foydalanuvchi profili' })
    @ApiResponse({ status: 200, description: 'Profil ma\'lumotlari' })
    @ApiResponse({ status: 401, description: 'Avtorizatsiya talab qilinadi' })
    getProfile(@CurrentUser() user: any) {
        return user;
    }
} 