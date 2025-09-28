import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserBranchAccessService } from './user-branch-access.service';
import { CreateUserBranchAccessDto } from './dto/create-user-branch-access.dto';
import { UpdateUserBranchAccessDto } from './dto/update-user-branch-access.dto';
import { UserBranchAccessResponseDto } from './dto/user-branch-access-response.dto';

@ApiTags('user-branch-access')
@Controller('user-branch-access')
export class UserBranchAccessController {
  constructor(private readonly userBranchAccessService: UserBranchAccessService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user-branch access' })
  @ApiResponse({ status: 201, description: 'User-branch access created successfully', type: UserBranchAccessResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User or Branch not found' })
  @ApiResponse({ status: 409, description: 'User already has access to this branch' })
  create(@Body() createUserBranchAccessDto: CreateUserBranchAccessDto) {
    return this.userBranchAccessService.create(createUserBranchAccessDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user-branch accesses' })
  @ApiResponse({ status: 200, description: 'List of all user-branch accesses', type: [UserBranchAccessResponseDto] })
  @ApiQuery({ name: 'userId', required: false, type: Number, description: 'Filter by user ID' })
  @ApiQuery({ name: 'branchId', required: false, type: Number, description: 'Filter by branch ID' })
  findAll(
    @Query('userId') userId?: string,
    @Query('branchId') branchId?: string,
  ) {
    if (userId) {
      return this.userBranchAccessService.findByUserId(parseInt(userId, 10));
    }
    if (branchId) {
      return this.userBranchAccessService.findByBranchId(parseInt(branchId, 10));
    }
    return this.userBranchAccessService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user-branch access by ID' })
  @ApiParam({ name: 'id', description: 'User-branch access ID' })
  @ApiResponse({ status: 200, description: 'User-branch access found', type: UserBranchAccessResponseDto })
  @ApiResponse({ status: 404, description: 'User-branch access not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userBranchAccessService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user-branch access' })
  @ApiParam({ name: 'id', description: 'User-branch access ID' })
  @ApiResponse({ status: 200, description: 'User-branch access updated', type: UserBranchAccessResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User-branch access, User, or Branch not found' })
  @ApiResponse({ status: 409, description: 'This user-branch access already exists' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserBranchAccessDto: UpdateUserBranchAccessDto,
  ) {
    return this.userBranchAccessService.update(id, updateUserBranchAccessDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user-branch access' })
  @ApiParam({ name: 'id', description: 'User-branch access ID' })
  @ApiResponse({ status: 204, description: 'User-branch access deleted' })
  @ApiResponse({ status: 404, description: 'User-branch access not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userBranchAccessService.remove(id);
  }
}
