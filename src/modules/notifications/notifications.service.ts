import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Notification, NotificationDocument } from './notification.schema';

import {
  NotificationDevice,
  NotificationDeviceDocument,
} from './notification-device.schema';

import { FirebaseProvider } from '../integrations/providers/firebase/firebase.provider';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,

    @InjectModel(NotificationDevice.name)
    private readonly notificationDeviceModel: Model<NotificationDeviceDocument>,

    private readonly firebaseProvider: FirebaseProvider,
  ) {}

  async createNotification(data: Partial<Notification>) {
    const notification = await this.notificationModel.create(data);

    await this.sendPushToUser(
      notification.userId.toString(),
      notification.title,
      notification.message,
      {
        notificationId: notification._id.toString(),
        source: notification.source,
        priority: notification.priority,
      },
    );

    return notification;
  }

  async registerDevice(userId: string, body: any) {
    const { token, platform = 'ANDROID', deviceName } = body;

    if (!token) {
      throw new BadRequestException('FCM token is required');
    }

    return this.notificationDeviceModel.findOneAndUpdate(
      { token },
      {
        userId: new Types.ObjectId(userId),
        token,
        platform,
        deviceName: deviceName || null,
        isActive: true,
        lastUsedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      },
    );
  }

  async unregisterDevice(userId: string, token: string) {
    if (!token) {
      throw new BadRequestException('FCM token is required');
    }

    return this.notificationDeviceModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        token,
      },
      {
        isActive: false,
        lastUsedAt: new Date(),
      },
      { new: true },
    );
  }

  async sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data: Record<string, any> = {},
  ) {
    const devices = await this.notificationDeviceModel.find({
      userId: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!devices.length) {
      this.logger.log(`No active devices found for user: ${userId}`);
      return {
        successCount: 0,
        failureCount: 0,
      };
    }

    const tokens = devices.map((device) => device.token);

    const safeData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value ?? '')]),
    );

    const response = await this.firebaseProvider
      .getMessaging()
      .sendEachForMulticast({
        tokens,
        notification: {
          title,
          body,
        },
        data: safeData,
      });

    this.logger.log(
      `Push sent to user ${userId}. Success: ${response.successCount}, Failed: ${response.failureCount}`,
    );

    await Promise.all(
      response.responses.map(async (res, index) => {
        if (res.success) return;

        const errorCode = res.error?.code;

        if (
          errorCode === 'messaging/registration-token-not-registered' ||
          errorCode === 'messaging/invalid-registration-token'
        ) {
          await this.notificationDeviceModel.findOneAndUpdate(
            { token: tokens[index] },
            {
              isActive: false,
              lastUsedAt: new Date(),
            },
          );
        }
      }),
    );

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  }

  async getAll(userId: string, cursor?: string, limit = '10') {
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 20);

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
