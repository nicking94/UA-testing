import { Module } from '@nestjs/common';
import { SupplierProductsController } from './supplier-products.controller';
import { SupplierProductsService } from './supplier-products.service';
import { PrismaModule } from '../prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  controllers: [SupplierProductsController],
  providers: [SupplierProductsService],
  exports: [SupplierProductsService],
})
export class SupplierProductsModule {}
