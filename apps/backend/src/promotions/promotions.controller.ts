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
import { PromotionsService } from './promotions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('promotions')
@UseGuards(JwtAuthGuard)
export class PromotionsController {
  constructor(private promotionsService: PromotionsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.promotionsService.findAll(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.promotionsService.create(data, req.user.id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.promotionsService.update(+id, data, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.promotionsService.delete(+id, req.user.id);
  }
}