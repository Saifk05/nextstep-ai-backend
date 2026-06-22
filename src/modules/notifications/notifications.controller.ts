import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post('register-device')
  registerDevice(@Req() req: any, @Body() body: any) {
    return this.notificationsService.registerDevice(req.user.userId, body);
  }

  @Delete('unregister-device')
  unregisterDevice(@Req() req: any, @Body('token') token: string) {
    return this.notificationsService.unregisterDevice(req.user.userId, token);
  }

  @Post('test')
  sendTestNotification(@Req() req: any) {
    return this.notificationsService.createNotification({
      userId: new Types.ObjectId(req.user.userId),
      title: 'NextStep AI Test',
      message: 'FCM push notification is working',
      source: 'SYSTEM',
      priority: 'HIGH',
      isPersistent: true,
      isRead: false,
    });
  }

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