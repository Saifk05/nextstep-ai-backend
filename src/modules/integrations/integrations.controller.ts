import { Controller, Get, Query, Redirect, Req } from '@nestjs/common';
import type { Request } from 'express';

import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('google/connect')
  getGoogleConnectUrl(@Req() req: Request) {
    const user = req.user as any;

    return this.integrationsService.generateGoogleAuthUrl(user.userId || user.id);
  }

  @Get('google/callback')
  @Redirect()
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    const redirectUrl = await this.integrationsService.handleGoogleCallback(
      code,
      state,
    );

    return {
      url: redirectUrl,
    };
  }

  @Get('google/status')
  getGoogleStatus(@Req() req: Request) {
    const user = req.user as any;

    return this.integrationsService.getGoogleStatus(user.userId || user.id);
  }

  @Get('google/calendar/events')
  getGoogleCalendarEvents(@Req() req: Request) {
    const user = req.user as any;

    return this.integrationsService.getGoogleCalendarEvents(
      user.userId || user.id,
    );
  }
}