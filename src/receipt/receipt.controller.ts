
import { Controller, Post, Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReceiptService } from './receipt.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Receipts')
@Controller('api/receipts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new receipt' })
  @ApiResponse({ status: 201, description: 'Receipt created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createReceiptDto: CreateReceiptDto) {
    try {
      return await this.receiptService.create(createReceiptDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
