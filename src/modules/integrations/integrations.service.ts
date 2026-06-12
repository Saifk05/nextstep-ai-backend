import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { google } from 'googleapis';

import {
  ConnectedAccount,
  ConnectedAccountDocument,
} from './schemas/connected-account.schema';
import { GoogleProvider } from './providers/google/google.provider';

@Injectable()
export class IntegrationsService {
  private readonly GOOGLE_CALENDAR_SCOPE =
    'https://www.googleapis.com/auth/calendar.readonly';

  constructor(
    @InjectModel(ConnectedAccount.name)
    private readonly connectedAccountModel: Model<ConnectedAccountDocument>,
    private readonly configService: ConfigService,
    private readonly googleProvider: GoogleProvider,
  ) {}

  generateGoogleAuthUrl(userId: string) {
    const oauth2Client = this.googleProvider.getOAuthClient();

    const state = this.createState(userId);

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [this.GOOGLE_CALENDAR_SCOPE],
      state,
    });

    return {
      success: true,
      message: 'Google Calendar OAuth URL generated successfully',
      data: {
        url,
      },
    };
  }

  async handleGoogleCallback(code: string, state: string) {
    if (!code) {
      throw new BadRequestException('Google authorization code is required');
    }

    if (!state) {
      throw new BadRequestException('OAuth state is required');
    }

    const { userId } = this.verifyState(state);

    const oauth2Client = this.googleProvider.getOAuthClient();

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new BadRequestException('Google access token not received');
    }

    oauth2Client.setCredentials(tokens);

    let googleEmail = '';

    try {
      const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);
      googleEmail = tokenInfo.email || '';
    } catch {
      googleEmail = '';
    }

    await this.connectedAccountModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        provider: 'GOOGLE',
      },
      {
        userId: new Types.ObjectId(userId),
        provider: 'GOOGLE',
        email: googleEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        scopes: tokens.scope ? tokens.scope.split(' ') : [this.GOOGLE_CALENDAR_SCOPE],
        isConnected: true,
        connectedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      },
    );

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:8100';

    return `${frontendUrl}/settings?google=connected`;
  }

  async getGoogleStatus(userId: string) {
    const account = await this.connectedAccountModel.findOne({
      userId: new Types.ObjectId(userId),
      provider: 'GOOGLE',
      isConnected: true,
    });

    return {
      success: true,
      message: 'Google Calendar connection status fetched successfully',
      data: {
        isConnected: !!account,
        provider: 'GOOGLE',
        email: account?.email || null,
        connectedAt: account?.connectedAt || null,
      },
    };
  }

  async getGoogleCalendarEvents(userId: string) {
    const account = await this.connectedAccountModel.findOne({
      userId: new Types.ObjectId(userId),
      provider: 'GOOGLE',
      isConnected: true,
    });

    if (!account) {
      throw new NotFoundException('Google Calendar is not connected');
    }

    const oauth2Client = this.googleProvider.getOAuthClient();

    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.expiryDate,
    });

    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        account.accessToken = tokens.access_token;
      }

      if (tokens.refresh_token) {
        account.refreshToken = tokens.refresh_token;
      }

      if (tokens.expiry_date) {
        account.expiryDate = tokens.expiry_date;
      }

      await account.save();
    });

    const calendar = google.calendar({
      version: 'v3',
      auth: oauth2Client,
    });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events =
      response.data.items?.map((event) => ({
        id: event.id,
        title: event.summary || 'No title',
        description: event.description || '',
        location: event.location || '',
        start: event.start?.dateTime || event.start?.date || null,
        end: event.end?.dateTime || event.end?.date || null,
        htmlLink: event.htmlLink,
        status: event.status,
      })) || [];

    return {
      success: true,
      message: 'Google Calendar events fetched successfully',
      data: events,
    };
  }

  private createState(userId: string): string {
    const payload = {
      userId,
      timestamp: Date.now(),
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signature = this.signState(payloadBase64);

    return `${payloadBase64}.${signature}`;
  }

  private verifyState(state: string): { userId: string } {
    const [payloadBase64, signature] = state.split('.');

    if (!payloadBase64 || !signature) {
      throw new UnauthorizedException('Invalid OAuth state');
    }

    const expectedSignature = this.signState(payloadBase64);

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid OAuth state signature');
    }

    const payload = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString('utf8'),
    );

    const stateAge = Date.now() - payload.timestamp;

    if (stateAge > 10 * 60 * 1000) {
      throw new UnauthorizedException('OAuth state expired');
    }

    return {
      userId: payload.userId,
    };
  }

  private signState(payloadBase64: string): string {
    const secret =
      this.configService.get<string>('JWT_SECRET') ||
      this.configService.get<string>('ACCESS_TOKEN_SECRET');

    if (!secret) {
      throw new BadRequestException('JWT_SECRET is missing in environment');
    }

    return crypto
      .createHmac('sha256', secret)
      .update(payloadBase64)
      .digest('base64url');
  }
}