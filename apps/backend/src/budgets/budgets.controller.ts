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
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private budgetsService: BudgetsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.budgetsService.findAll(req.user.id, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.budgetsService.findOne(id, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.budgetsService.create(data, req.user.id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.budgetsService.update(id, data, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.budgetsService.delete(id, req.user.id);
  }
}
