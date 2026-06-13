import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

import { LoggerModule } from './common/logger/logger.module';
import { AuthMiddleware } from './common/middleware/auth.middleware';

import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UserModule } from './modules/user/user.module';
import { TaskModule } from './modules/task/task.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
    }),

    MongooseModule.forRoot(databaseConfig().mongoUri),

    JwtModule.register({
      secret: jwtConfig().jwtSecret,
      signOptions: {
        expiresIn: jwtConfig().jwtExpiresIn as any,
      },
    }),

    LoggerModule,

    AuthModule,
    UserModule,
    DashboardModule,
    TaskModule,
    IntegrationsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(
      {
        path: 'auth/logout',
        method: RequestMethod.POST,
      },
      {
        path: 'dashboard/overview',
        method: RequestMethod.GET,
      },
      {
        path: 'users/profile',
        method: RequestMethod.GET,
      },
      {
        path: 'users/profile',
        method: RequestMethod.PATCH,
      },
      {
        path: 'users/profile-picture',
        method: RequestMethod.PATCH,
      },
      {
        path: 'users/address/suggestions',
        method: RequestMethod.GET,
      },
      {
        path: 'users/address',
        method: RequestMethod.PATCH,
      },

      // Task protected routes
      {
        path: 'tasks',
        method: RequestMethod.ALL,
      },
      {
        path: 'tasks/(.*)',
        method: RequestMethod.ALL,
      },

      // Google integration protected routes
      {
        path: 'integrations/google/connect',
        method: RequestMethod.GET,
      },
      {
        path: 'integrations/google/accounts',
        method: RequestMethod.GET,
      },
      {
        path: 'integrations/google/accounts/:id/default',
        method: RequestMethod.PATCH,
      },
      {
        path: 'integrations/google/accounts/:id',
        method: RequestMethod.DELETE,
      },
      {
        path: 'integrations/google/status',
        method: RequestMethod.GET,
      },
      {
        path: 'integrations/google/calendar/events',
        method: RequestMethod.GET,
      },
      {
        path: 'integrations/google/gmail/status',
        method: RequestMethod.GET,
      },
      {
        path: 'integrations/google/gmail/messages',
        method: RequestMethod.GET,
      },
      {
        path: 'integrations/google/gmail/unread',
        method: RequestMethod.GET,
      },
      {
        path: 'integrations/google/gmail/summary',
        method: RequestMethod.GET,
      },
    );
  }
}