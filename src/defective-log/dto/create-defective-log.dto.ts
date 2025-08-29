import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsIn } from 'class-validator';

export class CreateDefectiveLogDto {
  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @IsEnum(['DEFECTIVE', 'FIXED', 'RETURN', 'EXCHANGE'])
  actionType?: string;

  // Indicates if this defective log is created from a sale context
  @IsOptional()
  isFromSale?: boolean;

  // Optional sale linkage for better auditing/logic
  @IsOptional()
  @IsNumber()
  transactionId?: number;

  @IsOptional()
  @IsNumber()
  customerId?: number;

  // Optional cashier-entered cash adjustment direction and amount
  @IsOptional()
  @IsIn(['PLUS', 'MINUS'])
  cashAdjustmentDirection?: 'PLUS' | 'MINUS';

  @IsOptional()
  @IsNumber()
  cashAmount?: number;

  // Optional exchange info
  @IsOptional()
  @IsNumber()
  exchangeWithProductId?: number;

  @IsOptional()
  @IsNumber()
  replacementQuantity?: number;

  @IsOptional()
  @IsNumber()
  replacementUnitPrice?: number;
}
