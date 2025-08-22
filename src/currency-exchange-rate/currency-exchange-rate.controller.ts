import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { CurrencyExchangeRateService } from './currency-exchange-rate.service';
import { CreateCurrencyExchangeRateDto } from './dto/create-currency-exchange-rate.dto';
import { UpdateCurrencyExchangeRateDto } from './dto/update-currency-exchange-rate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('currency-exchange-rates')
@UseGuards(JwtAuthGuard)
export class CurrencyExchangeRateController {
  constructor(private readonly currencyExchangeRateService: CurrencyExchangeRateService) {}

  @Post()
  create(@Body() createCurrencyExchangeRateDto: CreateCurrencyExchangeRateDto, @Request() req) {
    return this.currencyExchangeRateService.create(createCurrencyExchangeRateDto, req.user.id);
  }

  @Get()
  findAll(@Query('branchId') branchId?: string) {
    const branchIdNum = branchId ? parseInt(branchId) : undefined;
    return this.currencyExchangeRateService.findAll(branchIdNum);
  }

  @Get('current-rate')
  getCurrentRate(
    @Query('fromCurrency') fromCurrency: string,
    @Query('toCurrency') toCurrency: string,
    @Query('branchId') branchId?: string,
  ) {
    const branchIdNum = branchId ? parseInt(branchId) : undefined;
    return this.currencyExchangeRateService.getCurrentRate(fromCurrency, toCurrency, branchIdNum);
  }

  @Get('convert')
  convertCurrency(
    @Query('amount') amount: string,
    @Query('fromCurrency') fromCurrency: string,
    @Query('toCurrency') toCurrency: string,
    @Query('branchId') branchId?: string,
  ) {
    const amountNum = parseFloat(amount);
    const branchIdNum = branchId ? parseInt(branchId) : undefined;
    return this.currencyExchangeRateService.convertCurrency(amountNum, fromCurrency, toCurrency, branchIdNum);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.currencyExchangeRateService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCurrencyExchangeRateDto: UpdateCurrencyExchangeRateDto,
  ) {
    return this.currencyExchangeRateService.update(+id, updateCurrencyExchangeRateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.currencyExchangeRateService.remove(+id);
  }
}
