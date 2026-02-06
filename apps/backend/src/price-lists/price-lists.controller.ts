import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PriceListsService } from './price-lists.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('price-lists')
@UseGuards(JwtAuthGuard)
export class PriceListsController {
  constructor(private priceListsService: PriceListsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.priceListsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.priceListsService.findOne(+id, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.priceListsService.create(data, req.user.id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.priceListsService.update(+id, data, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.priceListsService.delete(+id, req.user.id);
  }
}