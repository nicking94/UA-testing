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
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.productsService.findAll(req.user.id, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.productsService.findOne(+id, req.user.id);
  }

  @Get('barcode/:barcode')
  findByBarcode(@Req() req: any, @Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.productsService.create(data, req.user.id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.productsService.update(+id, data, req.user.id);
  }

  @Put(':id/stock')
  updateStock(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { stock: number },
  ) {
    return this.productsService.updateStock(+id, body.stock, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.productsService.delete(+id, req.user.id);
  }
}