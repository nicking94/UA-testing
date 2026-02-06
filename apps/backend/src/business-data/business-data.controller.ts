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
import { BusinessDataService } from './business-data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('business-data')
@UseGuards(JwtAuthGuard)
export class BusinessDataController {
  constructor(private businessDataService: BusinessDataService) {}

  @Get()
  findOne(@Req() req: any) {
    return this.businessDataService.findOne(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.businessDataService.create(data, req.user.id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.businessDataService.update(+id, data, req.user.id);
  }
}