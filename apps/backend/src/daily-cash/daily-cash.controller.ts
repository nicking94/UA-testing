import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { DailyCashService } from './daily-cash.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('daily-cash')
@UseGuards(JwtAuthGuard)
export class DailyCashController {
  constructor(private dailyCashService: DailyCashService) {}

  @Get()
  findAll() {
    return this.dailyCashService.findAll();
  }

  @Get('date/:date')
  findByDate(@Param('date') date: string) {
    return this.dailyCashService.findByDate(date);
  }

  @Post()
  create(@Body() data: any) {
    return this.dailyCashService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.dailyCashService.update(+id, data);
  }

  @Put(':id/close')
  close(@Param('id') id: string, @Body() data: any) {
    return this.dailyCashService.close(+id, data);
  }
}
