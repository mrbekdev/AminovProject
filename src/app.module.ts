import { Module } from '@nestjs/common';
import { GlobalRateModule } from './global-rate/global-rate.module';
import { SentryModule } from '@sentry/nestjs';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BranchModule } from './branch/branch.module';
import { UserModule } from './user/user.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { TransactionModule } from './transaction/transaction.module';
import { AuthModule } from './auth/auth.module';
import { LocationModule } from './location/location.module';
import { CustomerModule } from './customer/customer.module';
import { PaymentScheduleModule } from './payment-schedule/payment-schedule.module';
import { DefectiveLogModule } from './defective-log/defective-log.module';
import { CurrencyExchangeRateModule } from './currency-exchange-rate/currency-exchange-rate.module';
import { DailyRepaymentModule } from './daily-repayment/daily-repayment.module';
import { CreditRepaymentModule } from './credit-repayment/credit-repayment.module';
import { CashierReportModule } from './cashier-report/cashier-report.module';
import { BonusModule } from './bonus/bonus.module';
import { TransactionBonusProductModule } from './transaction-bonus-product/transaction-bonus-product.module';
import { WorkScheduleModule } from './work-schedule/work-schedule.module';
import { AttendanceModule } from './attendance/attendance.module';
import { UserBranchAccessModule } from './user-branch-access/user-branch-access.module';
import { TaskModule } from './task/task.module';
import { DailyExpenseModule } from './daily-expense/daily-expense.module';
import { DriverRatingModule } from './driver-rating/driver-rating.module';

@Module({
  imports: [
    // Initialize Sentry early in the imports
    SentryModule.forRoot({
      dsn: process.env.SENTRY_DSN ?? 'https://2edc6264958bb053b58f71c6df56b3f3@o4511265782366208.ingest.us.sentry.io/4511265786429440',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.0),
      // capture PII by default per the supplied instructions
      sendDefaultPii: true,
    }),
    GlobalRateModule,
    ConfigModule.forRoot({ isGlobal: true }),
    BranchModule, 
    UserModule, 
    CategoryModule, 
    ProductModule, 
    TransactionModule, 
    AuthModule, 
    LocationModule,
    CustomerModule, 
    PaymentScheduleModule, 
    DefectiveLogModule, 
    CurrencyExchangeRateModule, 
    DailyRepaymentModule, 
    CreditRepaymentModule, 
    CashierReportModule, 
    BonusModule, 
    TransactionBonusProductModule, 
    WorkScheduleModule, 
    AttendanceModule,
    UserBranchAccessModule,
    TaskModule,
    DailyExpenseModule,
    DriverRatingModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
