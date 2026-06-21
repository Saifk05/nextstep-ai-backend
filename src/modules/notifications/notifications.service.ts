import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Notification,
  NotificationDocument,
} from './notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async createNotification(data: Partial<Notification>) {
    return this.notificationModel.create(data);
  }

  async getAll(userId: string, cursor?: string, limit = '10') {
    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      20,
    );

    const query: any = {
      userId: new Types.ObjectId(userId),
    };

    if (cursor && Types.ObjectId.isValid(cursor)) {
      query._id = { $lt: new Types.ObjectId(cursor) };
    }

    const notifications = await this.notificationModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limitNumber + 1);

    const hasNextPage = notifications.length > limitNumber;

    if (hasNextPage) {
      notifications.pop();
    }

    const nextCursor = hasNextPage
      ? notifications[notifications.length - 1]?._id?.toString()
      : null;

    return {
      notifications,
      pagination: {
        limit: limitNumber,
        nextCursor,
        hasNextPage,
      },
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true },
    );
  }

  async markAllAsRead(userId: string) {
    return this.notificationModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );
  }

  async delete(userId: string, notificationId: string) {
    return this.notificationModel.findOneAndDelete({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    });
  }
}