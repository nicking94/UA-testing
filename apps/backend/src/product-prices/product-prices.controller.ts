import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProductPricesService } from './product-prices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('product-prices')
@UseGuards(JwtAuthGuard)
export class ProductPricesController {
  constructor(private productPricesService: ProductPricesService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.productPricesService.findAll(req.user.id, query);
  }

  @Get('product/:productId/price-list/:priceListId')
  findOne(
    @Req() req: any,
    @Param('productId') productId: string,
    @Param('priceListId') priceListId: string,
  ) {
    return this.productPricesService.findOne(+productId, +priceListId, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.productPricesService.create(data, req.user.id);
  }

  @Post('bulk')
  createMany(@Req() req: any, @Body() data: any[]) {
    return this.productPricesService.createMany(data, req.user.id);
  }

  @Put('product/:productId/price-list/:priceListId')
  update(
    @Req() req: any,
    @Param('productId') productId: string,
    @Param('priceListId') priceListId: string,
    @Body() data: any,
  ) {
    return this.productPricesService.update(+productId, +priceListId, data, req.user.id);
  }

  @Delete('product/:productId/price-list/:priceListId')
  delete(
    @Req() req: any,
    @Param('productId') productId: string,
    @Param('priceListId') priceListId: string,
  ) {
    return this.productPricesService.delete(+productId, +priceListId, req.user.id);
  }

  @Delete('price-list/:priceListId')
  deleteByPriceList(@Req() req: any, @Param('priceListId') priceListId: string) {
    return this.productPricesService.deleteByPriceList(+priceListId, req.user.id);
  }

  @Delete('product/:productId')
  deleteByProduct(@Req() req: any, @Param('productId') productId: string) {
    return this.productPricesService.deleteByProduct(+productId, req.user.id);
  }
}