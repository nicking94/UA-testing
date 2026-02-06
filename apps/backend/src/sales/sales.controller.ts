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
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.salesService.findAll(req.user.id, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.salesService.findOne(+id, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.salesService.create(data, req.user.id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.salesService.update(+id, data, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.salesService.delete(+id, req.user.id);
  }
}