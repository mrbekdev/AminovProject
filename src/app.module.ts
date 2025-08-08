import { Module } from '@nestjs/common';
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

import { ProductTransferModule } from './product-transfer/product-transfer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BranchModule, UserModule, CategoryModule, ProductModule, TransactionModule, AuthModule, LocationModule, CustomerModule, ProductTransferModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
