import {
  Controller,
  Get,
  Query,
  Redirect,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('google/connect')
  getGoogleConnectUrl(@Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);

    return this.integrationsService.generateGoogleAuthUrl(userId);
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
    const userId = this.getUserIdFromRequest(req);

    return this.integrationsService.getGoogleStatus(userId);
  }

  @Get('google/calendar/events')
  getGoogleCalendarEvents(@Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);

    return this.integrationsService.getGoogleCalendarEvents(userId);
  }

  @Get('google/gmail/status')
  getGoogleGmailStatus(@Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);

    return this.integrationsService.getGoogleGmailStatus(userId);
  }

  @Get('google/gmail/messages')
  getGoogleGmailMessages(@Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);

    return this.integrationsService.getGoogleGmailMessages(userId);
  }

  @Get('google/gmail/unread')
  getGoogleUnreadMessages(@Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);

    return this.integrationsService.getGoogleUnreadMessages(userId);
  }

  @Get('google/gmail/summary')
  getGoogleGmailSummary(@Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);

    return this.integrationsService.getGoogleGmailSummary(userId);
  }

  private getUserIdFromRequest(req: Request): string {
    const user = req.user as any;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const userId = user.userId || user.id || user._id || user.sub;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user id not found');
    }

    return userId.toString();
  }
}