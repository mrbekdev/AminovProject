import { IsInt, IsPositive } from 'class-validator';

export class CreateTransactionBonusProductDto {
  @IsInt()
  @IsPositive()
  transactionId: number;

  @IsInt()
  @IsPositive()
  productId: number;

  @IsInt()
  @IsPositive()
  quantity: number;
}
