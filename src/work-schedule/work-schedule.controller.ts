import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkScheduleService } from './work-schedule.service';
import { CreateWorkScheduleDto } from './dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Work Schedules')
@Controller('work-schedules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkScheduleController {
  constructor(private readonly workScheduleService: WorkScheduleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new work schedule' })
  @ApiResponse({ status: 201, description: 'Work schedule created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createWorkScheduleDto: CreateWorkScheduleDto) {
    try {
      return await this.workScheduleService.create(createWorkScheduleDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all work schedules' })
  @ApiResponse({ status: 200, description: 'Work schedules retrieved successfully' })
  async findAll() {
    return this.workScheduleService.findAll();
  }

  @Get('default')
  @ApiOperation({ summary: 'Get the default work schedule' })
  @ApiResponse({ status: 200, description: 'Default work schedule retrieved successfully' })
  async findDefault() {
    return this.workScheduleService.findDefault();
  }

  @Patch('default')
  @ApiOperation({ summary: 'Update the default work schedule' })
  @ApiResponse({ status: 200, description: 'Default work schedule updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateDefault(@Body() updateWorkScheduleDto: UpdateWorkScheduleDto) {
    try {
      return await this.workScheduleService.updateDefault(updateWorkScheduleDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get work schedule by ID' })
  @ApiResponse({ status: 200, description: 'Work schedule found' })
  @ApiResponse({ status: 404, description: 'Work schedule not found' })
  async findOne(@Param('id') id: string) {
    try {
      return await this.workScheduleService.findOne(+id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update work schedule' })
  @ApiResponse({ status: 200, description: 'Work schedule updated successfully' })
  @ApiResponse({ status: 404, description: 'Work schedule not found' })
  async update(@Param('id') id: string, @Body() updateWorkScheduleDto: UpdateWorkScheduleDto) {
    try {
      return await this.workScheduleService.update(+id, updateWorkScheduleDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete work schedule' })
  @ApiResponse({ status: 200, description: 'Work schedule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Work schedule not found' })
  async remove(@Param('id') id: string) {
    try {
      return await this.workScheduleService.remove(+id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
