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

      generateGoogleAuthUrl(
  userId: string,
  accountType?: string,
  platform?: string,
) {
  const oauth2Client = this.googleProvider.getOAuthClient();

  const safeAccountType =
    accountType === ConnectedAccountType.WORK
      ? ConnectedAccountType.WORK
      : ConnectedAccountType.PERSONAL;

  const safePlatform = platform === 'mobile' ? 'mobile' : 'web';

  const state = this.createState(
    userId,
    safeAccountType,
    safePlatform,
  );

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
    const { userId, accountType, platform } = this.verifyState(state);
    // const { userId, accountType } = this.verifyState(state);
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
      platform === 'mobile'
        ? 'nextstepai://'
        : this.configService.get<string>('FRONTEND_URL') ||
          'http://localhost:8100';

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

  // async getGoogleCalendarEvents(userId: string) {
  //   const account = await this.getConnectedGoogleAccount(userId);

  //   this.ensureScope(account, this.GOOGLE_CALENDAR_SCOPE, 'Google Calendar');

  //   const oauth2Client = await this.getAuthorizedGoogleClient(account);

  //   const calendar = google.calendar({
  //     version: 'v3',
  //     auth: oauth2Client,
  //   });

  //   try {
  //     const response = await calendar.events.list({
  //       calendarId: 'primary',
  //       timeMin: new Date().toISOString(),
  //       maxResults: 10,
  //       singleEvents: true,
  //       orderBy: 'startTime',
  //     });

  //     const events =
  //       response.data.items?.map((event) => ({
  //         id: event.id,
  //         title: event.summary || 'No title',
  //         description: event.description || '',
  //         location: event.location || '',
  //         start: event.start?.dateTime || event.start?.date || null,
  //         end: event.end?.dateTime || event.end?.date || null,
  //         htmlLink: event.htmlLink,
  //         status: event.status,
  //       })) || [];

  //     return {
  //       success: true,
  //       message: 'Google Calendar events fetched successfully',
  //       data: events,
  //     };
  //   } catch (error) {
  //     this.handleGoogleApiError(error, 'Google Calendar');
  //   }
  // }


  async getGoogleCalendarEvents(
  userId: string,
  accountId?: string,
  range = 'today',
  search?: string,
  pageToken?: string,
  limit?: string,
  after?: Date
) {
  const account = await this.getConnectedGoogleAccount(userId, accountId);

  this.ensureScope(account, this.GOOGLE_CALENDAR_SCOPE, 'Google Calendar');

  const oauth2Client = await this.getAuthorizedGoogleClient(account);

  const calendar = google.calendar({
    version: 'v3',
    auth: oauth2Client,
  });

  const maxResults = Math.min(Number(limit) || 10, 50);
  const { timeMin, timeMax } = this.getCalendarRange(range);

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults,
      pageToken,
      singleEvents: true,
      orderBy: 'startTime',
      q: search?.trim() || undefined,
      updatedMin: after?.toISOString(),
    });

    const events =
      response.data.items?.map((event) => {
        const mappedEvent = {
          id: event.id || '',
          title: event.summary || 'No title',
          description: event.description || '',
          location: event.location || '',
          startTime: event.start?.dateTime || event.start?.date || null,
          endTime: event.end?.dateTime || event.end?.date || null,
          isAllDay: !!event.start?.date,
          htmlLink: event.htmlLink || '',
          status: event.status || '',
          accountId: account._id.toString(),
          accountEmail: account.email,
          category: this.getCalendarEventCategory(event),
          priority: this.getCalendarEventPriority(event),
        };

        return mappedEvent;
      }) || [];

    return {
      success: true,
      message: 'Google Calendar events fetched successfully',
      summary: this.buildCalendarSummary(events),
      data: events,
      pagination: {
        nextPageToken: response.data.nextPageToken || null,
        limit: maxResults,
      },
    };
  } catch (error) {
    this.handleGoogleApiError(error, 'Google Calendar');
  }
}

private getCalendarRange(range?: string) {
  const now = new Date();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);

  switch (range) {
    case 'tomorrow':
      start.setDate(start.getDate() + 1);
      end.setDate(start.getDate() + 1);
      break;

    case 'week':
      end.setDate(start.getDate() + 7);
      break;

    case 'month':
      end.setMonth(start.getMonth() + 1);
      break;

    case 'today':
    default:
      end.setDate(start.getDate() + 1);
      break;
  }

  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  };
}

private getCalendarEventCategory(event: any): string {
  const text = `${event.summary || ''} ${event.description || ''} ${
    event.location || ''
  }`.toLowerCase();

  if (
    text.includes('interview') ||
    text.includes('recruiter') ||
    text.includes('hiring') ||
    text.includes('hr')
  ) {
    return 'INTERVIEW';
  }

  if (
    text.includes('deadline') ||
    text.includes('due') ||
    text.includes('submit') ||
    text.includes('last date')
  ) {
    return 'DEADLINE';
  }

  if (
    text.includes('flight') ||
    text.includes('hotel') ||
    text.includes('travel') ||
    text.includes('trip') ||
    text.includes('airport')
  ) {
    return 'TRAVEL';
  }

  if (
    text.includes('reminder') ||
    text.includes('follow up') ||
    text.includes('follow-up')
  ) {
    return 'REMINDER';
  }

  if (
    text.includes('meeting') ||
    text.includes('meet') ||
    text.includes('call') ||
    text.includes('sync') ||
    text.includes('discussion')
  ) {
    return 'MEETING';
  }

  return 'PERSONAL';
}

private getCalendarEventPriority(event: any): string {
  const category = this.getCalendarEventCategory(event);

  if (category === 'INTERVIEW' || category === 'DEADLINE') {
    return 'HIGH';
  }

  if (category === 'MEETING' || category === 'TRAVEL') {
    return 'MEDIUM';
  }

  return 'LOW';
}

private buildCalendarSummary(events: any[]) {
  return {
    todayEvents: events.length,
    upcomingMeetings: events.filter((event) => event.category === 'MEETING')
      .length,
    deadlines: events.filter((event) => event.category === 'DEADLINE').length,
    interviews: events.filter((event) => event.category === 'INTERVIEW')
      .length,
  };
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

  async getGoogleGmailMessages(
  userId: string,
  accountId?: string,
  pageToken?: string,
  limit?: string,
  search?: string,
  category?: string,
  days?: string,
   after?: Date,
) {
  try {
    const gmail = await this.getGmailClient(userId, accountId);

    const maxResults = Math.min(Number(limit) || 20, 50);
    const safeDays = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;

    const query = this.buildGmailQuery(search, category, safeDays, after);

    const [total, unread, important, response] = await Promise.all([
      gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 1,
      }),

      gmail.users.messages.list({
        userId: 'me',
        q: `${query} is:unread`,
        maxResults: 1,
      }),

      gmail.users.messages.list({
        userId: 'me',
        q: `${query} is:important`,
        maxResults: 1,
      }),

      gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
        pageToken,
      }),
    ]);

    const messageIds = response.data.messages || [];

    const mappedMessages = await Promise.all(
      messageIds.map(async (message) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id || '',
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });

        const mappedMessage = this.mapGmailMessage(detail.data);

        return {
          ...mappedMessage,
          category: this.getGmailMessageCategory(mappedMessage),
          priority: this.getGmailMessagePriority(mappedMessage),
        };
      }),
    );

const safeCategory = category?.toUpperCase() || 'ALL';

const messages = mappedMessages.filter((email) => {
  if (this.isUselessEmail(email)) {
    return false;
  }

  if (safeCategory !== 'ALL' && email.category !== safeCategory) {
    return false;
  }

  return true;
});

    return {
      success: true,
      message: 'Gmail messages fetched successfully',
      // summary: {
      //   totalEmails: total.data.resultSizeEstimate || 0,
      //   unreadEmails: unread.data.resultSizeEstimate || 0,
      //   importantEmails: important.data.resultSizeEstimate || 0,
      // },

      summary: {
      totalEmails: messages.length,
      unreadEmails: messages.filter((email) => email.isUnread).length,
      importantEmails: messages.filter(
        (email) =>
          email.priority === 'HIGH' ||
          email.category === 'INTERVIEW' ||
          email.category === 'DEADLINE',
      ).length,
    },
      data: messages,
      pagination: {
        nextPageToken: response.data.nextPageToken || null,
          resultSizeEstimate: messages.length,
          limit: maxResults,
      },
    };
  } catch (error) {
    this.handleGoogleApiError(error, 'Gmail');
  }
}

private buildGmailQuery(
  search?: string,
  category?: string,
  days = 30,
  after?: Date,
): string {
  const baseFilters = [
    after
      ? `after:${Math.floor(after.getTime() / 1000)}`
      : `newer_than:${days}d`,
    '-in:spam',
    '-in:trash',
    '-(quora OR digest OR newsletter OR promotion OR unsubscribe)',
  ];

  const categoryQueries: Record<string, string> = {
    ALL:
      '(interview OR interviewed OR recruiter OR hiring OR HR OR job OR offer OR selected OR shortlisted OR "follow-up" OR "follow up" OR "next steps" OR deadline OR meeting OR "payment failed" OR "payment unsuccessful" OR renewal OR subscription OR receipt OR invoice OR bill OR order OR delivered OR shipped OR shipment OR tracking OR "out for delivery")',

    INTERVIEW:
      '(interview OR interviewed OR recruiter OR hiring OR HR OR job OR offer OR selected OR shortlisted OR "follow-up" OR "follow up" OR "next steps")',

    ORDER:
      '(order OR ordered OR delivered OR shipped OR shipment OR tracking OR invoice OR receipt OR "out for delivery" OR amazon OR myntra OR flipkart)',

    SUBSCRIPTION:
      '(subscription OR membership OR renewed OR renewal OR netflix OR "amazon prime" OR "google play")',

    PAYMENT:
      '("payment failed" OR "payment unsuccessful" OR paid OR payment OR bill OR invoice OR receipt)',

    MEETING:
      '(meeting OR "calendar invite" OR invitation OR schedule OR scheduled)',

    DEADLINE:
      '(deadline OR "due date" OR "last date" OR "final reminder")',
  };

  const safeCategory = category?.toUpperCase() || 'ALL';
  const categoryQuery = categoryQueries[safeCategory] || categoryQueries.ALL;

  const safeSearch = search?.trim();

  if (safeSearch) {
    baseFilters.push(`"${safeSearch.replace(/"/g, '')}"`);
  }

  return [...baseFilters, categoryQuery].join(' ');
}

private isUselessEmail(email: any): boolean {
  const text = `${email.subject || ''} ${email.from || ''} ${
    email.snippet || ''
  }`.toLowerCase();

  const blockedKeywords = [
    'quora',
    'digest',
    'newsletter',
    'unsubscribe',
    'facebook',
    'instagram',
    'twitter',
    'x.com',
    'reddit',
    'medium',
    'promotional',
    'promotion',
    'marketing',
  ];

  return blockedKeywords.some((word) => text.includes(word));
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

  private getGmailMessageCategory(email: any): string {
    const text = `${email.subject || ''} ${email.from || ''} ${
      email.snippet || ''
    }`.toLowerCase();

    if (
      text.includes('interview') ||
      text.includes('interviewed') ||
      text.includes('recruiter') ||
      text.includes('hiring') ||
      text.includes('shortlisted') ||
      text.includes('selected') ||
      text.includes('offer') ||
      text.includes('follow-up') ||
      text.includes('follow up') ||
      text.includes('next steps')
    ) {
      return 'INTERVIEW';
    }

    if (
  text.includes('payment failed') ||
  text.includes('payment unsuccessful') ||
  text.includes('last payment attempt') ||
  text.includes('bill payment') ||
  text.includes('recharge') ||
  text.includes('paid') ||
  text.includes('payment')
) {
  return 'PAYMENT';
}

if (
  text.includes('order') ||
  text.includes('ordered') ||
  text.includes('delivered') ||
  text.includes('shipped') ||
  text.includes('shipment') ||
  text.includes('tracking') ||
  text.includes('out for delivery') ||
  text.includes('amazon') ||
  text.includes('myntra') ||
  text.includes('flipkart')
) {
  return 'ORDER';
}

    if (
      text.includes('subscription') ||
      text.includes('membership') ||
      text.includes('renewed') ||
      text.includes('renewal') ||
      text.includes('receipt') ||
      text.includes('payment unsuccessful') ||
      text.includes('payment failed') ||
      text.includes('netflix') ||
      text.includes('amazon prime') ||
      text.includes('google play')
    ) {
      return 'SUBSCRIPTION';
    }

    if (
      text.includes('deadline') ||
      text.includes('due date') ||
      text.includes('last date') ||
      text.includes('final reminder')
    ) {
      return 'DEADLINE';
    }

    if (
      text.includes('meeting') ||
      text.includes('calendar invite') ||
      text.includes('invitation')
    ) {
      return 'MEETING';
    }

    return 'OTHER';
  }

  private getGmailMessagePriority(email: any): string {
    const category = this.getGmailMessageCategory(email);

    if (category === 'INTERVIEW') {
      return 'HIGH';
    }

    if (category === 'DEADLINE') {
      return 'HIGH';
    }

    if (category === 'MEETING') {
      return 'MEDIUM';
    }

    if (category === 'SUBSCRIPTION') {
      return 'MEDIUM';
    }

    if (category === 'PAYMENT') {
      return 'MEDIUM';
    }

    if (category === 'ORDER') {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  async getGoogleGmailSummary(userId: string, accountId?: string) {
  try {
    const gmail = await this.getGmailClient(userId, accountId);

    const now = new Date();

    const istNow = new Date(
      now.toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
      }),
    );

    const istStart = new Date(istNow);
    istStart.setHours(0, 0, 0, 0);

    const istEnd = new Date(istStart);
    istEnd.setDate(istEnd.getDate() + 1);

    const utcStart = new Date(
      istStart.getTime() - 5.5 * 60 * 60 * 1000,
    );

    const utcEnd = new Date(
      istEnd.getTime() - 5.5 * 60 * 60 * 1000,
    );

    const startTimestamp = Math.floor(utcStart.getTime() / 1000);
    const endTimestamp = Math.floor(utcEnd.getTime() / 1000);

    const baseQuery = `in:inbox after:${startTimestamp} before:${endTimestamp} -in:spam -in:trash`;

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: baseQuery,
      maxResults: 5,
    });

    const messageIds = response.data.messages || [];

    const emails = await Promise.all(
      messageIds.map(async (message) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id || '',
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });

        const mappedMessage = this.mapGmailMessage(detail.data);

        return {
          ...mappedMessage,
          category: this.getGmailMessageCategory(mappedMessage),
          priority: this.getGmailMessagePriority(mappedMessage),
        };
      }),
    );

    return {
      success: true,
      message: 'Gmail summary fetched successfully',
      data: {
        totalEmails: emails.length,
        unreadEmails: emails.filter((email) => email.isUnread).length,
        importantEmails: emails.filter(
          (email) =>
            email.priority === 'HIGH' ||
            email.category === 'INTERVIEW' ||
            email.category === 'DEADLINE',
        ).length,
        emails,
      },
    };
  } catch (error) {
    this.handleGoogleApiError(error, 'Gmail');
  }
}

  private async getGmailClient(
    userId: string,
    accountId?: string,
  ) {
    const account = await this.getConnectedGoogleAccount(
      userId,
      accountId,
    );

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
  console.log(`${serviceName} GOOGLE API ERROR`);
  console.log('code:', error?.code);
  console.log('message:', error?.message);
  console.log('response:', error?.response?.data);

  const status = error?.code || error?.response?.status;

  if (status === 401) {
    throw new ForbiddenException(
      `${serviceName} token expired or invalid. Please reconnect Google account.`,
    );
  }

  if (status === 403) {
    throw new ForbiddenException(
      error?.response?.data?.error_description ||
        error?.response?.data?.error ||
        error?.message ||
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
  platform: 'web' | 'mobile' = 'web',
): string {
  const payload = {
    userId,
    accountType,
    platform,
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
  platform: 'web' | 'mobile';
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
    platform: payload.platform === 'mobile' ? 'mobile' : 'web',
  };
}


  //   private verifyState(state: string): {
  //     userId: string;
  //     accountType: ConnectedAccountType;
  //   } {
  //   const [payloadBase64, signature] = state.split('.');

  //   if (!payloadBase64 || !signature) {
  //     throw new UnauthorizedException('Invalid OAuth state');
  //   }

  //   const expectedSignature = this.signState(payloadBase64);

  //   if (signature !== expectedSignature) {
  //     throw new UnauthorizedException('Invalid OAuth state signature');
  //   }

  //   const payload = JSON.parse(
  //     Buffer.from(payloadBase64, 'base64url').toString('utf8'),
  //   );

  //   const stateAge = Date.now() - payload.timestamp;

  //   if (stateAge > 10 * 60 * 1000) {
  //     throw new UnauthorizedException('OAuth state expired');
  //   }

  //   return {
  //     userId: payload.userId,
  //     accountType:
  //       payload.accountType === ConnectedAccountType.WORK
  //         ? ConnectedAccountType.WORK
  //         : ConnectedAccountType.PERSONAL,
  //   };
  // }

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
async getNotificationGmailData(
  userId: string,
  accountId?: string,
  after?: Date,
) {
  const response = await this.getGoogleGmailMessages(
    userId,
    accountId,
    undefined,
    '50',
    undefined,
    undefined,
    undefined,
    after,
  );

  return response?.data || [];
}

async getNotificationCalendarData(
  userId: string,
  accountId?: string,
  after?: Date,
) {
  const response = await this.getGoogleCalendarEvents(
    userId,
    accountId,
    'today',
    undefined,
    undefined,
    '50',
    after,
  );

  return response?.data || [];
} 
}