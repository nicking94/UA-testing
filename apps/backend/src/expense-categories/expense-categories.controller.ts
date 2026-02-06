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
import { ExpenseCategoriesService } from './expense-categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('expense-categories')
@UseGuards(JwtAuthGuard)
export class ExpenseCategoriesController {
  constructor(private expenseCategoriesService: ExpenseCategoriesService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.expenseCategoriesService.findAll(req.user.id, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.expenseCategoriesService.findOne(+id, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.expenseCategoriesService.create(data, req.user.id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.expenseCategoriesService.update(+id, data, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.expenseCategoriesService.delete(+id, req.user.id);
  }
}