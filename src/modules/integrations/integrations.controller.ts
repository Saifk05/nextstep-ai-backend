import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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

  @Post('google/connect/init')
  sendGoogleConnectOtp(@Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);

    return this.integrationsService.sendGoogleConnectOtp(userId);
  }

  @Post('google/connect/verify-otp')
  verifyGoogleConnectOtp(
    @Req() req: Request,
    @Body('otp') otp: string,
  ) {
    const userId = this.getUserIdFromRequest(req);

    return this.integrationsService.verifyGoogleConnectOtp(userId, otp);
  }

  @Get('google/connect')
  getGoogleConnectUrl(
    @Req() req: Request,
    @Query('accountType') accountType?: string,
  ) {
    const userId = this.getUserIdFromRequest(req);

    return this.integrationsService.generateGoogleAuthUrl(
      userId,
      accountType,
    );
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

  @Get('google/accounts')
  getGoogleAccounts(@Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);

    return this.integrationsService.getGoogleAccounts(userId);
  }

  @Patch('google/accounts/:id/default')
  setDefaultGoogleAccount(
    @Req() req: Request,
    @Param('id') accountId: string,
  ) {
    const userId = this.getUserIdFromRequest(req);

    return this.integrationsService.setDefaultGoogleAccount(
      userId,
      accountId,
    );
  }

  @Delete('google/accounts/:id')
  deleteGoogleAccount(
    @Req() req: Request,
    @Param('id') accountId: string,
  ) {
    const userId = this.getUserIdFromRequest(req);

    return this.integrationsService.deleteGoogleAccount(userId, accountId);
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