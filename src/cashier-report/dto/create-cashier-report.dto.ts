import { IsNumber, IsDateString } from 'class-validator';

export class CreateCashierReportDto {
  @IsNumber()
  cashierId: number;

  @IsNumber()
  branchId: number;

  @IsDateString()
  reportDate: string;

  @IsNumber()
  cashTotal: number;

  @IsNumber()
  cardTotal: number;

  @IsNumber()
  creditTotal: number;

  @IsNumber()
  installmentTotal: number;

  @IsNumber()
  upfrontTotal: number;

  @IsNumber()
  upfrontCash: number;

  @IsNumber()
  upfrontCard: number;

  @IsNumber()
  soldQuantity: number;

  @IsNumber()
  soldAmount: number;

  @IsNumber()
  repaymentTotal: number;

  @IsNumber()
  defectivePlus: number;

  @IsNumber()
  defectiveMinus: number;
}
