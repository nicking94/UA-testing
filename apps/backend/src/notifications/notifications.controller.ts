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
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.notificationsService.findAll(req.user.id, query);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.notificationsService.create(data, req.user.id);
  }

  @Put(':id/read')
  markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(+id, req.user.id);
  }

  @Put('mark-all-read')
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.delete(+id, req.user.id);
  }
}