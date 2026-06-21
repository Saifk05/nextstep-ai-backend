import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';

import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  getNotifications(
    @Req() req: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getAll(
      req.user.userId,
      cursor,
      limit,
    );
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Patch(':id/read')
  markAsRead(@Req() req: any, @Param('id') notificationId: string) {
    return this.notificationsService.markAsRead(
      req.user.userId,
      notificationId,
    );
  }

  @Delete(':id')
  deleteNotification(
    @Req() req: any,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.delete(
      req.user.userId,
      notificationId,
    );
  }
}