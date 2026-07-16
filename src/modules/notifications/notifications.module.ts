import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Notification, NotificationSchema } from './notification.schema';

import {
  NotificationDevice,
  NotificationDeviceSchema,
} from './notification-device.schema';

import {
  ConnectedAccount,
  ConnectedAccountSchema,
} from '../integrations/schemas/connected-account.schema';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationGeneratorService } from './notification-generator.service';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    forwardRef(() => IntegrationsModule),

    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationDevice.name, schema: NotificationDeviceSchema },
      { name: ConnectedAccount.name, schema: ConnectedAccountSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationGeneratorService],
  exports: [NotificationsService, NotificationGeneratorService],
})
export class NotificationsModule {}
