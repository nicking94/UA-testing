import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SalesModule } from './sales/sales.module';
import { PaymentsModule } from './payments/payments.module';
import { DailyCashModule } from './daily-cash/daily-cash.module';
import { BudgetsModule } from './budgets/budgets.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PromotionsModule } from './promotions/promotions.module';
import { PriceListsModule } from './price-lists/price-lists.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BusinessDataModule } from './business-data/business-data.module';
import { SupplierProductsModule } from './supplier-products/supplier-products.module';
import { InstallmentsModule } from './installments/installments.module';
import { UserPreferencesModule } from './user-preferences/user-preferences.module';
import { CustomCategoriesModule } from './custom-categories/custom-categories.module';
import { ProductReturnsModule } from './product-returns/product-returns.module';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';
import { ProductPricesModule } from './product-prices/product-prices.module';
import { BackupModule } from './backup/backup.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CustomersModule,
    SuppliersModule,
    SalesModule,
    PaymentsModule,
    DailyCashModule,
    BudgetsModule,
    ExpensesModule,
    PromotionsModule,
    PriceListsModule,
    NotificationsModule,
    BusinessDataModule,
    SupplierProductsModule,
    InstallmentsModule,
    UserPreferencesModule,
    CustomCategoriesModule,
    ProductReturnsModule,
    ExpenseCategoriesModule,
    ProductPricesModule,
    BackupModule,
  ],
})
export class AppModule {}
