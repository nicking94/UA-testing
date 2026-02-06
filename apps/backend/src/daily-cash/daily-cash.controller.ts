import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DailyCashService } from './daily-cash.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('daily-cash')
@UseGuards(JwtAuthGuard)
export class DailyCashController {
  constructor(private dailyCashService: DailyCashService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.dailyCashService.findAll(req.user.id);
  }

  @Get('date/:date')
  findByDate(@Req() req: any, @Param('date') date: string) {
    return this.dailyCashService.findByDate(date, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.dailyCashService.create(data, req.user.id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.dailyCashService.update(+id, data, req.user.id);
  }

  @Put(':id/close')
  close(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.dailyCashService.close(+id, data, req.user.id);
  }
}
