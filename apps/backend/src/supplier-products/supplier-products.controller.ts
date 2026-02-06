import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SupplierProductsService } from './supplier-products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('supplier-products')
@UseGuards(JwtAuthGuard)
export class SupplierProductsController {
  constructor(private supplierProductsService: SupplierProductsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.supplierProductsService.findAll(req.user.id);
  }

  @Get('supplier/:supplierId')
  findBySupplier(@Req() req: any, @Param('supplierId') supplierId: string) {
    return this.supplierProductsService.findBySupplier(+supplierId, req.user.id);
  }

  @Get('product/:productId')
  findByProduct(@Req() req: any, @Param('productId') productId: string) {
    return this.supplierProductsService.findByProduct(+productId, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: { supplierId: number; productId: number }) {
    return this.supplierProductsService.create(data, req.user.id);
  }

  @Delete(':supplierId/:productId')
  delete(
    @Req() req: any,
    @Param('supplierId') supplierId: string,
    @Param('productId') productId: string,
  ) {
    return this.supplierProductsService.delete(+supplierId, +productId, req.user.id);
  }
}
