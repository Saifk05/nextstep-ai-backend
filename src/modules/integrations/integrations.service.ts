import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { google, gmail_v1 } from 'googleapis';
import { UserService } from '../user/user.service';


import {
  ConnectedAccount,
  ConnectedAccountDocument,
  ConnectedProvider,
  ConnectedAccountType,
  ConnectedService,
} from './schemas/connected-account.schema';
import { GoogleProvider } from './providers/google/google.provider';
import { MailService } from '../../common/mail/mail.service';


@Injectable()
export class IntegrationsService {
    private readonly GOOGLE_CALENDAR_SCOPE =
      'https://www.googleapis.com/auth/calendar.readonly';

    private readonly GOOGLE_GMAIL_READONLY_SCOPE =
      'https://www.googleapis.com/auth/gmail.readonly';

      constructor(
        @InjectModel(ConnectedAccount.name)
        private readonly connectedAccountModel: Model<ConnectedAccountDocument>,
        private readonly configService: ConfigService,
        private readonly googleProvider: GoogleProvider,
        private readonly mailService: MailService,
        private readonly userService: UserService,
      ) {}

    generateGoogleAuthUrl(userId: string, accountType?: string) {
      const oauth2Client = this.googleProvider.getOAuthClient();

const safeAccountType =
  accountType === ConnectedAccountType.WORK
    ? ConnectedAccountType.WORK
    : ConnectedAccountType.PERSONAL;

const state = this.createState(userId, safeAccountType);

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: [
        'openid',
        'email',
        'profile',
        this.GOOGLE_CALENDAR_SCOPE,
        this.GOOGLE_GMAIL_READONLY_SCOPE,
      ],
      state,
    });

    return {
      success: true,
      message: 'Google OAuth URL generated successfully',
      data: { url },
    };
  }

  async handleGoogleCallback(code: string, state: string) {
    if (!code) {
      throw new BadRequestException('Google authorization code is required');
    }

    if (!state) {
      throw new BadRequestException('OAuth state is required');
    }

    const { userId, accountType } = this.verifyState(state);
    const userObjectId = new Types.ObjectId(userId);

    const oauth2Client = this.googleProvider.getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new BadRequestException('Google access token not received');
    }

    oauth2Client.setCredentials(tokens);

let googleEmail = '';

try {
  const oauth2 = google.oauth2({
    version: 'v2',
    auth: oauth2Client,
  });

  const profile = await oauth2.userinfo.get();

  googleEmail = profile.data.email?.toLowerCase() || '';
} catch (error) {
  console.log('GOOGLE PROFILE EMAIL ERROR:', error);
  googleEmail = '';
}

    if (!googleEmail) {
      throw new BadRequestException('Unable to fetch Google account email');
    }

    const existingAccount = await this.connectedAccountModel.findOne({
      userId: userObjectId,
      provider: ConnectedProvider.GOOGLE,
      email: googleEmail,
    });

    const existingDefaultAccount = await this.connectedAccountModel.findOne({
      userId: userObjectId,
      provider: ConnectedProvider.GOOGLE,
      isConnected: true,
      isDefault: true,
    });

    const tokenScopes = tokens.scope
      ? tokens.scope.split(' ')
      : [this.GOOGLE_CALENDAR_SCOPE, this.GOOGLE_GMAIL_READONLY_SCOPE];

    const mergedScopes = Array.from(
      new Set([...(existingAccount?.scopes || []), ...tokenScopes]),
    );

    await this.connectedAccountModel.findOneAndUpdate(
      {
        userId: userObjectId,
        provider: ConnectedProvider.GOOGLE,
        email: googleEmail,
      },
      {
        userId: userObjectId,
        provider: ConnectedProvider.GOOGLE,
        email: googleEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || existingAccount?.refreshToken,
        expiryDate: tokens.expiry_date || existingAccount?.expiryDate,
        scopes: mergedScopes,
        isConnected: true,
        isDefault: existingAccount?.isDefault || !existingDefaultAccount,
        enabledServices: [ConnectedService.GMAIL, ConnectedService.CALENDAR],
        accountType: existingAccount?.accountType || accountType,
        connectedAt: existingAccount?.connectedAt || new Date(),
        lastSyncAt: new Date(),
        lastSyncedAt: new Date(),
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

  async getGoogleAccounts(userId: string) {
    const accounts = await this.connectedAccountModel
      .find({
        userId: new Types.ObjectId(userId),
        provider: ConnectedProvider.GOOGLE,
        isConnected: true,
      })
      .sort({ isDefault: -1, connectedAt: -1 })
      .exec();

    return {
      success: true,
      message: 'Google accounts fetched successfully',
      data: accounts.map((account) => ({
        id: account._id,
        provider: account.provider,
        email: account.email,
        isConnected: account.isConnected,
        isDefault: account.isDefault || false,
        enabledServices: account.enabledServices || [],
        accountType: account.accountType || ConnectedAccountType.PERSONAL,
        connectedAt: account.connectedAt || null,
        lastSyncAt: account.lastSyncAt || account.lastSyncedAt || null,
      })),
    };
  }

  async setDefaultGoogleAccount(userId: string, accountId: string) {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new BadRequestException('Invalid connected account id');
    }

    const userObjectId = new Types.ObjectId(userId);

    const account = await this.connectedAccountModel.findOne({
      _id: new Types.ObjectId(accountId),
      userId: userObjectId,
      provider: ConnectedProvider.GOOGLE,
      isConnected: true,
    });

    if (!account) {
      throw new NotFoundException('Google account not found');
    }

    await this.connectedAccountModel.updateMany(
      {
        userId: userObjectId,
        provider: ConnectedProvider.GOOGLE,
      },
      {
        $set: { isDefault: false },
      },
    );

    account.isDefault = true;
    await account.save();

    return {
      success: true,
      message: 'Default Google account updated successfully',
      data: {
        id: account._id,
        email: account.email,
        isDefault: account.isDefault,
      },
    };
  }

  async deleteGoogleAccount(userId: string, accountId: string) {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new BadRequestException('Invalid connected account id');
    }

    const userObjectId = new Types.ObjectId(userId);

    const account = await this.connectedAccountModel.findOne({
      _id: new Types.ObjectId(accountId),
      userId: userObjectId,
      provider: ConnectedProvider.GOOGLE,
    });

    if (!account) {
      throw new NotFoundException('Google account not found');
    }

    const wasDefault = account.isDefault;

    await account.deleteOne();

    if (wasDefault) {
      const nextAccount = await this.connectedAccountModel.findOne({
        userId: userObjectId,
        provider: ConnectedProvider.GOOGLE,
        isConnected: true,
      });

      if (nextAccount) {
        nextAccount.isDefault = true;
        await nextAccount.save();
      }
    }

    return {
      success: true,
      message: 'Google account disconnected successfully',
    };
  }

  async getGoogleStatus(userId: string) {
    const accounts = await this.connectedAccountModel.find({
      userId: new Types.ObjectId(userId),
      provider: ConnectedProvider.GOOGLE,
      isConnected: true,
    });

    const defaultAccount =
      accounts.find((account) => account.isDefault) || accounts[0];

    const hasRefreshToken = !!defaultAccount?.refreshToken;

    return {
      success: true,
      message: 'Google connection status fetched successfully',
      data: {
        isConnected: accounts.length > 0 && hasRefreshToken,
        provider: ConnectedProvider.GOOGLE,
        totalConnectedAccounts: accounts.length,
        defaultAccount: defaultAccount
          ? {
              id: defaultAccount._id,
              email: defaultAccount.email,
              isDefault: defaultAccount.isDefault,
              connectedAt: defaultAccount.connectedAt || null,
              calendarConnected:
                hasRefreshToken &&
                this.hasScope(defaultAccount, this.GOOGLE_CALENDAR_SCOPE),
              gmailConnected:
                hasRefreshToken &&
                this.hasScope(defaultAccount, this.GOOGLE_GMAIL_READONLY_SCOPE),
            }
          : null,
        accounts: accounts.map((account) => ({
          id: account._id,
          email: account.email,
          isDefault: account.isDefault || false,
          enabledServices: account.enabledServices || [],
          accountType: account.accountType || ConnectedAccountType.PERSONAL,
        })),
      },
    };
  }

  async getGoogleCalendarEvents(userId: string) {
    const account = await this.getConnectedGoogleAccount(userId);

    this.ensureScope(account, this.GOOGLE_CALENDAR_SCOPE, 'Google Calendar');

    const oauth2Client = await this.getAuthorizedGoogleClient(account);

    const calendar = google.calendar({
      version: 'v3',
      auth: oauth2Client,
    });

    try {
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
    } catch (error) {
      this.handleGoogleApiError(error, 'Google Calendar');
    }
  }

  async getGoogleGmailStatus(userId: string) {
    const account = await this.getConnectedGoogleAccount(userId);

    return {
      success: true,
      message: 'Google Gmail connection status fetched successfully',
      data: {
        accountId: account._id,
        email: account.email,
        isConnected:
          !!account.refreshToken &&
          this.hasScope(account, this.GOOGLE_GMAIL_READONLY_SCOPE),
      },
    };
  }

  async getGoogleGmailMessages(userId: string) {
    try {
      const gmail = await this.getGmailClient(userId);

      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 20,
      });

      const messageIds = response.data.messages || [];

      const messages = await Promise.all(
        messageIds.map(async (message) => {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: message.id || '',
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date'],
          });

          return this.mapGmailMessage(detail.data);
        }),
      );

      return {
        success: true,
        message: 'Gmail messages fetched successfully',
        data: messages,
      };
    } catch (error) {
      this.handleGoogleApiError(error, 'Gmail');
    }
  }

  async getGoogleUnreadMessages(userId: string) {
    const gmail = await this.getGmailClient(userId);

    try {
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 20,
        labelIds: ['UNREAD'],
      });

      const messageIds = response.data.messages || [];

      const messages = await Promise.all(
        messageIds.map(async (message) => {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: message.id || '',
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date'],
          });

          return this.mapGmailMessage(detail.data);
        }),
      );

      return {
        success: true,
        message: 'Unread Gmail messages fetched successfully',
        data: messages,
      };
    } catch (error) {
      this.handleGoogleApiError(error, 'Gmail');
    }
  }

  async getGoogleGmailSummary(userId: string) {
    try {
      const gmail = await this.getGmailClient(userId);

      const [profile, unread, important] = await Promise.all([
        gmail.users.getProfile({ userId: 'me' }),
        gmail.users.messages.list({
          userId: 'me',
          labelIds: ['UNREAD'],
          maxResults: 1,
        }),
        gmail.users.messages.list({
          userId: 'me',
          labelIds: ['IMPORTANT'],
          maxResults: 1,
        }),
      ]);

      return {
        success: true,
        message: 'Gmail summary fetched successfully',
        data: {
          totalEmails: profile.data.messagesTotal || 0,
          unreadEmails: unread.data.resultSizeEstimate || 0,
          importantEmails: important.data.resultSizeEstimate || 0,
        },
      };
    } catch (error) {
      this.handleGoogleApiError(error, 'Gmail');
    }
  }

  private async getGmailClient(userId: string) {
    const account = await this.getConnectedGoogleAccount(userId);

    this.ensureScope(account, this.GOOGLE_GMAIL_READONLY_SCOPE, 'Gmail');

    const oauth2Client = await this.getAuthorizedGoogleClient(account);

    return google.gmail({
      version: 'v1',
      auth: oauth2Client,
    });
  }

  private async getConnectedGoogleAccount(userId: string, accountId?: string) {
    const filter: any = {
      userId: new Types.ObjectId(userId),
      provider: ConnectedProvider.GOOGLE,
      isConnected: true,
    };

    if (accountId) {
      if (!Types.ObjectId.isValid(accountId)) {
        throw new BadRequestException('Invalid connected account id');
      }

      filter._id = new Types.ObjectId(accountId);
    } else {
      filter.isDefault = true;
    }

    let account = await this.connectedAccountModel.findOne(filter);

    if (!account && !accountId) {
      account = await this.connectedAccountModel.findOne({
        userId: new Types.ObjectId(userId),
        provider: ConnectedProvider.GOOGLE,
        isConnected: true,
      });

      if (account) {
        account.isDefault = true;
        await account.save();
      }
    }

    if (!account) {
      throw new NotFoundException(
        accountId
          ? 'Selected Google account is not connected'
          : 'Default Google account is not connected',
      );
    }

    if (!account.refreshToken) {
      throw new ForbiddenException(
        'Google refresh token is missing. Please reconnect Google account.',
      );
    }

    return account;
  }

  private async getAuthorizedGoogleClient(account: ConnectedAccountDocument) {
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

    const isExpired =
      !account.expiryDate || account.expiryDate <= Date.now() + 60 * 1000;

    if (isExpired) {
      try {
        const refreshedToken = await oauth2Client.refreshAccessToken();
        const credentials = refreshedToken.credentials;

        if (credentials.access_token) {
          account.accessToken = credentials.access_token;
        }

        if (credentials.refresh_token) {
          account.refreshToken = credentials.refresh_token;
        }

        if (credentials.expiry_date) {
          account.expiryDate = credentials.expiry_date;
        }

        await account.save();

        oauth2Client.setCredentials({
          access_token: account.accessToken,
          refresh_token: account.refreshToken,
          expiry_date: account.expiryDate,
        });
      } catch {
        throw new ForbiddenException(
          'Google token expired or invalid. Please reconnect Google account.',
        );
      }
    }

    return oauth2Client;
  }

  private mapGmailMessage(message: gmail_v1.Schema$Message) {
    const headers = message.payload?.headers || [];

    const subject = this.getHeaderValue(headers, 'Subject');
    const from = this.getHeaderValue(headers, 'From');
    const date = this.getHeaderValue(headers, 'Date');

    return {
      id: message.id || '',
      threadId: message.threadId || '',
      subject: subject || '(No subject)',
      from: from || '',
      snippet: message.snippet || '',
      receivedAt: date ? new Date(date).toISOString() : null,
      isUnread: message.labelIds?.includes('UNREAD') || false,
    };
  }

  private getHeaderValue(
    headers: gmail_v1.Schema$MessagePartHeader[],
    name: string,
  ) {
    return (
      headers.find(
        (header) => header.name?.toLowerCase() === name.toLowerCase(),
      )?.value || ''
    );
  }

  private hasScope(
    account: ConnectedAccountDocument | null,
    scope: string,
  ): boolean {
    return !!account?.scopes?.includes(scope);
  }

  private ensureScope(
    account: ConnectedAccountDocument,
    scope: string,
    serviceName: string,
  ) {
    if (!account.scopes?.includes(scope)) {
      throw new ForbiddenException(
        `${serviceName} permission is missing. Please reconnect Google account.`,
      );
    }
  }

  private handleGoogleApiError(error: any, serviceName: string): never {
    const status = error?.code || error?.response?.status;

    if (status === 401) {
      throw new ForbiddenException(
        `${serviceName} token expired or invalid. Please reconnect Google account.`,
      );
    }

    if (status === 403) {
      throw new ForbiddenException(
        `${serviceName} permission denied. Please reconnect Google account with required permissions.`,
      );
    }

    throw new BadRequestException(
      error?.message || `${serviceName} API error`,
    );
  }

    private createState(
      userId: string,
      accountType: ConnectedAccountType,
    ): string {
      const payload = {
        userId,
        accountType,
        timestamp: Date.now(),
      };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );

    const signature = this.signState(payloadBase64);

    return `${payloadBase64}.${signature}`;
  }


    private verifyState(state: string): {
      userId: string;
      accountType: ConnectedAccountType;
    } {
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
      accountType:
        payload.accountType === ConnectedAccountType.WORK
          ? ConnectedAccountType.WORK
          : ConnectedAccountType.PERSONAL,
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

  private generateOtp(): string {
    return Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
  }

  async sendGoogleConnectOtp(userId: string) {
  const user = await this.userService.findById(userId);

  if (!user) {
    throw new NotFoundException('User not found');
  }

  const otp = this.generateOtp();

  await this.userService.updateById(userId, {
    otp: {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verified: false,
    },
  });

  await this.mailService.sendGoogleConnectOtp(
    user.email,
    otp,
    user.firstName,
  );

  return {
    success: true,
    message: 'OTP sent successfully',
  };
}

async verifyGoogleConnectOtp(
  userId: string,
  otp: string,
) {
  const user = await this.userService.findById(userId);

  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (!user.otp?.code) {
    throw new BadRequestException(
      'OTP not requested',
    );
  }

  if (user.otp.code !== otp) {
    throw new BadRequestException(
      'Invalid OTP',
    );
  }

  if (
    user.otp.expiresAt &&
    user.otp.expiresAt < new Date()
  ) {
    throw new BadRequestException(
      'OTP expired',
    );
  }

  await this.userService.updateById(userId, {
    otp: {
      ...user.otp,
      verified: true,
    },
  });

  return {
    success: true,
    message: 'OTP verified successfully',
  };
}

  
}