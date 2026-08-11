import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ApproveDebtCashierReportDto {
  @IsOptional()
  @IsNumber()
  acceptedCashAmount?: number;

  @IsOptional()
  @IsNumber()
  acceptedClick9905Amount?: number;

  @IsOptional()
  @IsNumber()
  acceptedBankAccountAmount?: number;

  @IsOptional()
  @IsNumber()
  acceptedOnlineAmount?: number;

  @IsOptional()
  @IsNumber()
  acceptedTerminalAmount?: number;

  @IsOptional()
  @IsNumber()
  acceptedMibAmount?: number;

  @IsOptional()
  @IsString()
  accountantNotes?: string;
}
