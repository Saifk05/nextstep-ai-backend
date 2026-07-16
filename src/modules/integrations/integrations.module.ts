import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  ConnectedAccount,
  ConnectedAccountSchema,
} from './schemas/connected-account.schema';

import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { GoogleProvider } from './providers/google/google.provider';
import { FirebaseProvider } from './providers/firebase/firebase.provider';

import { MailModule } from '../../common/mail/mail.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MailModule,
    UserModule,
    MongooseModule.forFeature([
      {
        name: ConnectedAccount.name,
        schema: ConnectedAccountSchema,
      },
    ]),
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, GoogleProvider, FirebaseProvider],
  exports: [IntegrationsService, FirebaseProvider],
})
export class IntegrationsModule {}
