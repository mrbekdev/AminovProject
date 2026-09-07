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
import { SalaryPaymentService } from './salary-payment.service';
import { CreateSalaryPaymentDto } from './dto/create-salary-payment.dto';
import { UpdateSalaryPaymentDto } from './dto/update-salary-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Salary Payments')
@Controller('salary-payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SalaryPaymentController {
  constructor(private readonly salaryPaymentService: SalaryPaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new salary payment' })
  @ApiResponse({ status: 201, description: 'Salary payment recorded successfully' })
  async create(@Body() createDto: CreateSalaryPaymentDto, @Request() req) {
    try {
      const createdById = req.user.userId;
      return await this.salaryPaymentService.create(createDto, createdById);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all salary payments' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID filter' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter (YYYY-MM-DD)' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Branch ID filter' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  async findAll(@Query() query: any) {
    return this.salaryPaymentService.findAll(query);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get salary payments for specific user' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async findByUserId(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salaryPaymentService.findByUserId(+userId, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get salary payment by ID' })
  async findOne(@Param('id') id: string) {
    return this.salaryPaymentService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update salary payment' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateSalaryPaymentDto) {
    return this.salaryPaymentService.update(+id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete salary payment' })
  async remove(@Param('id') id: string) {
    return this.salaryPaymentService.remove(+id);
  }
}
