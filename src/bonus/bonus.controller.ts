import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BonusService } from './bonus.service';
import { CreateBonusDto } from './dto/create-bonus.dto';
import { UpdateBonusDto } from './dto/update-bonus.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Bonuses')
@Controller('bonuses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BonusController {
  constructor(private readonly bonusService: BonusService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bonus' })
  @ApiResponse({ status: 201, description: 'Bonus created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createBonusDto: CreateBonusDto, @Request() req) {
    try {
      const createdById = req.user.userId;
      return await this.bonusService.create(createBonusDto, createdById);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all bonuses' })
  @ApiQuery({ name: 'skip', required: false, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, description: 'Number of records to take' })
  async findAll(@Query('skip') skip = '0', @Query('take') take = '100') {
    return this.bonusService.findAll(+skip, +take);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get bonuses by user ID' })
  @ApiQuery({ name: 'skip', required: false, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, description: 'Number of records to take' })
  async findByUserId(
    @Param('userId') userId: string,
    @Query('skip') skip = '0',
    @Query('take') take = '100',
  ) {
    return this.bonusService.findByUserId(+userId, +skip, +take);
  }

  @Get('user/:userId/total')
  @ApiOperation({ summary: 'Get total bonus amount and count by user ID' })
  async getTotalBonusByUserId(@Param('userId') userId: string) {
    return this.bonusService.getTotalBonusByUserId(+userId);
  }

  @Get('transaction/:transactionId')
  @ApiOperation({ summary: 'Get bonus details by transaction ID' })
  @ApiResponse({ status: 200, description: 'Bonus details found' })
  @ApiResponse({ status: 404, description: 'No bonus found for this transaction' })
  async findByTransactionId(@Param('transactionId') transactionId: string) {
    try {
      return await this.bonusService.findByTransactionId(+transactionId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bonus by ID' })
  @ApiResponse({ status: 200, description: 'Bonus found' })
  @ApiResponse({ status: 404, description: 'Bonus not found' })
  async findOne(@Param('id') id: string) {
    try {
      return await this.bonusService.findOne(+id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update bonus' })
  @ApiResponse({ status: 200, description: 'Bonus updated successfully' })
  @ApiResponse({ status: 404, description: 'Bonus not found' })
  async update(@Param('id') id: string, @Body() updateBonusDto: UpdateBonusDto) {
    try {
      return await this.bonusService.update(+id, updateBonusDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete bonus' })
  @ApiResponse({ status: 200, description: 'Bonus deleted successfully' })
  @ApiResponse({ status: 404, description: 'Bonus not found' })
  async remove(@Param('id') id: string) {
    try {
      return await this.bonusService.remove(+id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
