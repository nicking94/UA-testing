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
import { ProductReturnsService } from './product-returns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('product-returns')
@UseGuards(JwtAuthGuard)
export class ProductReturnsController {
  constructor(private productReturnsService: ProductReturnsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.productReturnsService.findAll(req.user.id, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.productReturnsService.findOne(+id, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.productReturnsService.create(data, req.user.id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.productReturnsService.update(+id, data, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.productReturnsService.delete(+id, req.user.id);
  }
}