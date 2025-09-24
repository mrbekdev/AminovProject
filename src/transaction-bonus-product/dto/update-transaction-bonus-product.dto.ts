import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionBonusProductDto } from './create-transaction-bonus-product.dto';

export class UpdateTransactionBonusProductDto extends PartialType(CreateTransactionBonusProductDto) {}
