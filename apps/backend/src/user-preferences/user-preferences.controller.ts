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
import { UserPreferencesService } from './user-preferences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('user-preferences')
@UseGuards(JwtAuthGuard)
export class UserPreferencesController {
  constructor(private userPreferencesService: UserPreferencesService) {}

  @Get()
  findOne(@Req() req: any) {
    return this.userPreferencesService.findOne(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.userPreferencesService.create(data, req.user.id);
  }

  @Put('upsert')
  upsert(@Req() req: any, @Body() data: any) {
    return this.userPreferencesService.upsert(data, req.user.id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.userPreferencesService.update(+id, data, req.user.id);
  }
}
