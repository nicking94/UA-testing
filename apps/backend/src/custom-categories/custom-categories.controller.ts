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
import { CustomCategoriesService } from './custom-categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('custom-categories')
@UseGuards(JwtAuthGuard)
export class CustomCategoriesController {
  constructor(private customCategoriesService: CustomCategoriesService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.customCategoriesService.findAll(req.user.id, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.customCategoriesService.findOne(+id, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.customCategoriesService.create(data, req.user.id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.customCategoriesService.update(+id, data, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.customCategoriesService.delete(+id, req.user.id);
  }
}