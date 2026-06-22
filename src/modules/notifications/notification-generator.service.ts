import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Notification } from './notification.schema';
import { NotificationsService } from './notifications.service';
import { IntegrationsService } from '../integrations/integrations.service';

import {
  ConnectedAccount,
  ConnectedProvider,
  ConnectedService,
} from '../integrations/schemas/connected-account.schema';

@Injectable()
export class NotificationGeneratorService {
  private readonly logger = new Logger(NotificationGeneratorService.name);

  constructor(
    @InjectModel(ConnectedAccount.name)
    private readonly connectedAccountModel: Model<ConnectedAccount>,

    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,

    private readonly integrationsService: IntegrationsService,

    private readonly notificationsService: NotificationsService,
  ) {
    this.logger.log('NotificationGeneratorService initialized');
  }

  // TEMP: enable only for testing
  // @Cron('*/1 * * * *')
  // async runFastNotificationSync() {
  //   this.logger.log('1 minute notification cron running');
  //   await this.generateNotifications('FAST_1_MIN');
  // }

  @Cron('0 */3 * * *')
  async runRecoveryNotificationSync() {
    this.logger.log('3 hour recovery notification cron running');
    await this.generateNotifications('RECOVERY_3_HOUR');
  }

  private async generateNotifications(syncType: string) {
    this.logger.log(`Notification generator started: ${syncType}`);

    const accounts = await this.connectedAccountModel.find({
      provider: ConnectedProvider.GOOGLE,
      isConnected: true,
    });

    this.logger.log(`Connected Google accounts found: ${accounts.length}`);

    for (const account of accounts) {
      try {
        const syncStartedAt = new Date();

        this.logger.log(
          `Processing account: ${account.email} | services: ${account.enabledServices?.join(', ')}`,
        );

        if (account.enabledServices?.includes(ConnectedService.GMAIL)) {
          await this.processGmail(account);
        } else {
          this.logger.log(`Gmail disabled for: ${account.email}`);
        }

        if (account.enabledServices?.includes(ConnectedService.CALENDAR)) {
          await this.processCalendar(account);
        } else {
          this.logger.log(`Calendar disabled for: ${account.email}`);
        }

        account.lastNotificationSyncedAt = syncStartedAt;
        await account.save();

        this.logger.log(
          `Notification sync timestamp updated for: ${account.email}`,
        );
      } catch (error) {
        this.logger.error(
          `Notification sync failed for ${account.email}`,
          error?.stack || error,
        );
      }
    }

    this.logger.log(`Notification generator completed: ${syncType}`);
  }

  private async processGmail(account: any) {
    this.logger.log(
      `Checking Gmail for ${account.email} after: ${
        account.lastNotificationSyncedAt || 'FIRST_SYNC'
      }`,
    );

    const emails = await this.integrationsService.getNotificationGmailData(
      account.userId.toString(),
      account._id.toString(),
      account.lastNotificationSyncedAt,
    );

    this.logger.log(`Emails found for ${account.email}: ${emails.length}`);

    for (const email of emails) {
      this.logger.log(
        `Email detected | subject: ${email.subject} | category: ${email.category} | priority: ${email.priority}`,
      );

      const receivedAt = email.receivedAt ? new Date(email.receivedAt) : null;

      if (
        account.lastNotificationSyncedAt &&
        receivedAt &&
        receivedAt <= account.lastNotificationSyncedAt
      ) {
        this.logger.log(`Skipping old email: ${email.subject}`);
        continue;
      }

      const uniqueKey = `${account.userId}_GMAIL_${email.id}`;

      await this.createNotificationIfNotExists({
        userId: account.userId,
        title: this.getGmailTitle(email),
        message: email.snippet || email.subject || 'Important email found',
        source: 'GMAIL',
        priority: email.priority || 'MEDIUM',
        externalId: email.id,
        uniqueKey,
        accountId: account._id,
        metadata: {
          category: email.category,
          subject: email.subject,
          from: email.from,
          receivedAt: email.receivedAt,
          accountEmail: account.email,
        },
      });
    }
  }

  private async processCalendar(account: any) {
    this.logger.log(
      `Checking Calendar for ${account.email} after: ${
        account.lastNotificationSyncedAt || 'FIRST_SYNC'
      }`,
    );

    const events = await this.integrationsService.getNotificationCalendarData(
      account.userId.toString(),
      account._id.toString(),
      account.lastNotificationSyncedAt,
    );

    this.logger.log(
      `Calendar events found for ${account.email}: ${events.length}`,
    );

    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    for (const event of events) {
      this.logger.log(
        `Calendar event detected | title: ${event.title} | category: ${event.category} | priority: ${event.priority}`,
      );

      const startTime = event.startTime ? new Date(event.startTime) : null;

      if (!startTime) {
        this.logger.log(
          `Skipping calendar event with no start time: ${event.title}`,
        );
        continue;
      }

      if (startTime < now || startTime > next24Hours) {
        this.logger.log(`Skipping calendar event outside 24h: ${event.title}`);
        continue;
      }

      const uniqueKey = `${account.userId}_CALENDAR_${event.id}`;

      await this.createNotificationIfNotExists({
        userId: account.userId,
        title: 'Upcoming Event',
        message: `${event.title} starts at ${startTime.toLocaleString()}`,
        source: 'CALENDAR',
        priority: event.priority || 'MEDIUM',
        externalId: event.id,
        uniqueKey,
        accountId: account._id,
        metadata: {
          category: event.category,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          accountEmail: account.email,
        },
      });
    }
  }

  private async createNotificationIfNotExists(payload: any) {
    const exists = await this.notificationModel.exists({
      uniqueKey: payload.uniqueKey,
    });

    if (exists) {
      this.logger.log(`Duplicate skipped: ${payload.uniqueKey}`);
      return;
    }

await this.notificationsService.createNotification({
  userId: payload.userId,
  title: payload.title,
  message: payload.message,
  source: payload.source,
  priority: payload.priority,
  externalId: payload.externalId,
  uniqueKey: payload.uniqueKey,
  accountId: payload.accountId,
  metadata: payload.metadata || {},
  isPersistent: true,
  isRead: false,
});

    this.logger.log(
      `Notification created and pushed | source: ${payload.source} | title: ${payload.title}`,
    );
  }

  private getGmailTitle(email: any): string {
    if (email.category === 'INTERVIEW') return 'Interview Reminder';
    if (email.category === 'ORDER') return 'Order Update';
    if (email.category === 'SUBSCRIPTION') return 'Subscription Reminder';
    if (email.category === 'PAYMENT') return 'Payment Reminder';
    if (email.category === 'DEADLINE') return 'Deadline Reminder';
    if (email.category === 'MEETING') return 'Meeting Reminder';

    return 'Important Email';
  }
}