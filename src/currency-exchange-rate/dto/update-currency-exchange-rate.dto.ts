import { PartialType } from '@nestjs/mapped-types';
import { CreateCurrencyExchangeRateDto } from './create-currency-exchange-rate.dto';

export class UpdateCurrencyExchangeRateDto extends PartialType(CreateCurrencyExchangeRateDto) {}
