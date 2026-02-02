import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SupplierProductsService } from './supplier-products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('supplier-products')
@UseGuards(JwtAuthGuard)
export class SupplierProductsController {
  constructor(private supplierProductsService: SupplierProductsService) {}

  @Get()
  findAll() {
    return this.supplierProductsService.findAll();
  }

  @Get('supplier/:supplierId')
  findBySupplier(@Param('supplierId') supplierId: string) {
    return this.supplierProductsService.findBySupplier(+supplierId);
  }

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.supplierProductsService.findByProduct(+productId);
  }

  @Post()
  create(@Body() data: { supplierId: number; productId: number }) {
    return this.supplierProductsService.create(data);
  }

  @Delete(':supplierId/:productId')
  delete(
    @Param('supplierId') supplierId: string,
    @Param('productId') productId: string,
  ) {
    return this.supplierProductsService.delete(+supplierId, +productId);
  }
}
