import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  HttpException, HttpStatus, UseGuards, Req
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Users') // Swaggerda kategoriya nomi
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post()
  @ApiOperation({ summary: 'Yangi foydalanuvchi yaratish' })
  @ApiResponse({ status: 201, description: 'Foydalanuvchi yaratildi' })
  @ApiResponse({ status: 400, description: 'Xato so\'rov' })
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      return await this.userService.create(createUserDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id/dashboard-stats')
  @ApiOperation({ summary: 'Foydalanuvchi dashboard statistikasini olish' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'branchId', required: false })
  async getDashboardStats(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('branchId') branchId?: string,
    @Req() req?: any
  ) {
    const userRole = req?.user?.role || 'ADMIN';
    try {
      return await this.userService.getUserDashboardStats(
        +id, 
        startDate, 
        endDate, 
        userRole, 
        branchId ? +branchId : undefined
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Foydalanuvchi maʼlumotini olish' })
  @ApiResponse({ status: 200, description: 'Foydalanuvchi topildi' })
  @ApiResponse({ status: 404, description: 'Topilmadi' })
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findOne(+id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Get('check-username')
  @ApiOperation({ summary: 'Check if username exists' })
  @ApiQuery({ name: 'username', required: true })
  @ApiQuery({ name: 'currentUserId', required: false })
  async checkUsername(
    @Query('username') username: string,
    @Query('currentUserId') currentUserId?: string
  ) {
    const exists = await this.userService.checkUsernameExists(username, currentUserId ? +currentUserId : undefined);
    return { exists, userId: exists ? (await this.userService.findByUsername(username))?.id  : null };
  }

  @Get()
  @ApiOperation({ summary: 'Barcha foydalanuvchilarni olish' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  async findAll(@Query('skip') skip = '0', @Query('take') take = '100') {
    return this.userService.findAll(+skip, +take);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Foydalanuvchini tahrirlash' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    try {
      return await this.userService.update(+id, updateUserDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Foydalanuvchini o\'chirish' })
  async remove(@Param('id') id: string) {
    try {
      return await this.userService.remove(+id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
