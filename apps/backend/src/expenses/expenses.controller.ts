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
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.expensesService.findAll(req.user.id, query);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.expensesService.create(data, req.user.id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.expensesService.update(+id, data, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.expensesService.delete(+id, req.user.id);
  }
}