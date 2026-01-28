import { Module } from '@nestjs/common';
import { ProductReturnsController } from './product-returns.controller';
import { ProductReturnsService } from './product-returns.service';
import { PrismaModule } from '../prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  controllers: [ProductReturnsController],
  providers: [ProductReturnsService],
  exports: [ProductReturnsService],
})
export class ProductReturnsModule {}
