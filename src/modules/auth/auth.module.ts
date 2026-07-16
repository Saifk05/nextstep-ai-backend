import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { UserModule } from '../user/user.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    UserModule,

    IntegrationsModule,

    JwtModule.register({
      secret: process.env.JWT_SECRET || 'nextai_secret_key',

      signOptions: {
        expiresIn: '15m',
      },
    }),
  ],

  controllers: [AuthController],

  providers: [AuthService],

  exports: [AuthService],
})
export class AuthModule {}
