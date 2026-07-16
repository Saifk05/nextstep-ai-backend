// src/common/mail/mail.service.ts

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { googleConnectOtpTemplate } from './templates/google-connect-otp.template';

export type GoalReminderEmailType =
  | 'FOLLOW_UP_TOMORROW'
  | 'FOLLOW_UP_DUE'
  | 'NO_RESPONSE'
  | 'APPLICATION_REJECTED';

export interface GoalReminderEmailParams {
  to: string;
  type: GoalReminderEmailType;

  firstName?: string;
  recruiterName?: string;
  company?: string;
  targetRole?: string;
  dueDate?: Date;
}

interface GoalReminderEmailContent {
  subject: string;
  message: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host =
      this.configService.get<string>('EMAIL_HOST') || 'smtp.gmail.com';

    const port = Number(this.configService.get<string>('EMAIL_PORT') || 587);

    const user = this.configService.get<string>('EMAIL_USER');

    const pass = this.configService.get<string>('EMAIL_PASS');

    if (!user || !pass) {
      throw new BadRequestException('EMAIL_USER and EMAIL_PASS are required');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,

      auth: {
        user,
        pass,
      },
    });
  }

  async sendGoogleConnectOtp(
    to: string,
    otp: string,
    firstName?: string,
  ): Promise<boolean> {
    const from = this.getFromAddress();

    try {
      await this.transporter.sendMail({
        from,
        to,

        subject: 'Your NextStep AI verification code',

        text:
          `Hi ${firstName || 'there'}, ` +
          `your NextStep AI verification code is ${otp}. ` +
          `This code expires in 10 minutes.`,

        html: googleConnectOtpTemplate({
          firstName,
          email: to,
          otp,
          expiryMinutes: 10,
        }),
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Unable to send Google connection OTP to ${to}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        'Unable to send verification email',
      );
    }
  }

  async sendTestEmail(to: string) {
    const from = this.getFromAddress();

    try {
      await this.transporter.sendMail({
        from,
        to,

        subject: 'NextStep AI SMTP Test',

        text:
          'SMTP is working. This is a test email ' +
          'from NextStep AI backend.',

        html: `
          <h2>SMTP is working</h2>
          <p>
            This is a test email from the
            NextStep AI backend.
          </p>
        `,
      });

      return {
        success: true,
        message: 'Test email sent successfully',
      };
    } catch (error) {
      this.logger.error(
        `Unable to send test email to ${to}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException('Unable to send test email');
    }
  }

  async sendGoalReminderEmail(
    params: GoalReminderEmailParams,
  ): Promise<boolean> {
    if (!params.to?.trim()) {
      this.logger.warn(
        'Goal reminder email skipped because recipient email is missing',
      );

      return false;
    }

    const from = this.getFromAddress();

    const firstName = params.firstName?.trim() || 'there';

    const recruiterOrCompany =
      params.recruiterName?.trim() || params.company?.trim() || 'the recruiter';

    const role = params.targetRole?.trim() || 'your job opportunity';

    const formattedDueDate = params.dueDate
      ? params.dueDate.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null;

    const emailContent = this.getGoalReminderEmailContent({
      type: params.type,
      recruiterOrCompany,
      role,
      formattedDueDate,
    });

    try {
      await this.transporter.sendMail({
        from,
        to: params.to,

        subject: emailContent.subject,

        text: [
          `Hi ${firstName},`,
          '',
          emailContent.message,
          '',
          'Open NextStep AI to review the update and take the next action.',
          '',
          'NextStep AI',
        ].join('\n'),

        html: this.buildGoalReminderHtml({
          firstName,
          message: emailContent.message,
        }),
      });

      this.logger.log(
        `Goal reminder email sent to ${params.to}: ${params.type}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Unable to send goal reminder email to ${params.to}`,
        error instanceof Error ? error.stack : String(error),
      );

      /*
       * Do not throw an exception here.
       *
       * This method will be called from a cron job.
       * One failed email should not stop reminders
       * from being processed for other users.
       */
      return false;
    }
  }

  private getGoalReminderEmailContent(params: {
    type: GoalReminderEmailType;
    recruiterOrCompany: string;
    role: string;
    formattedDueDate: string | null;
  }): GoalReminderEmailContent {
    const { type, recruiterOrCompany, role, formattedDueDate } = params;

    switch (type) {
      case 'FOLLOW_UP_TOMORROW':
        return {
          subject: `Follow-up due tomorrow: ` + recruiterOrCompany,

          message:
            `Your follow-up with ` +
            `${recruiterOrCompany} for ${role} ` +
            `is due tomorrow` +
            `${formattedDueDate ? `, ${formattedDueDate}` : ''}.`,
        };

      case 'FOLLOW_UP_DUE':
        return {
          subject: `Follow-up due today: ` + recruiterOrCompany,

          message:
            `You have not received a reply from ` +
            `${recruiterOrCompany}. ` +
            `Your follow-up for ${role} is due today.`,
        };

      case 'NO_RESPONSE':
        return {
          subject: `No response: ${recruiterOrCompany}`,

          message:
            `No response was detected from ` +
            `${recruiterOrCompany} for ${role} ` +
            `after the configured follow-up period. ` +
            `This outreach has been marked as no response.`,
        };

      case 'APPLICATION_REJECTED':
        return {
          subject: `Application update: ` + recruiterOrCompany,

          message:
            `A rejection email from ` +
            `${recruiterOrCompany} was detected ` +
            `for ${role}. Future follow-up reminders ` +
            `for this outreach have been stopped.`,
        };

      default:
        throw new Error(`Unsupported goal reminder email type: ${type}`);
    }
  }

  private buildGoalReminderHtml(params: {
    firstName: string;
    message: string;
  }): string {
    const safeFirstName = this.escapeHtml(params.firstName);

    const safeMessage = this.escapeHtml(params.message);

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />

          <title>NextStep AI Reminder</title>
        </head>

        <body
          style="
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
            font-family: Arial, sans-serif;
            color: #111827;
          "
        >
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="background-color: #f3f4f6;"
          >
            <tr>
              <td
                align="center"
                style="padding: 32px 16px;"
              >
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    max-width: 600px;
                    background-color: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                  "
                >
                  <tr>
                    <td
                      style="
                        padding: 24px 32px;
                        background-color: #2563eb;
                        color: #ffffff;
                        font-size: 22px;
                        font-weight: 700;
                      "
                    >
                      NextStep AI
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding: 32px;
                        font-size: 16px;
                        line-height: 1.6;
                      "
                    >
                      <p
                        style="
                          margin: 0 0 20px;
                        "
                      >
                        Hi ${safeFirstName},
                      </p>

                      <p
                        style="
                          margin: 0 0 24px;
                        "
                      >
                        ${safeMessage}
                      </p>

                      <p
                        style="
                          margin: 0;
                          color: #4b5563;
                          font-size: 14px;
                        "
                      >
                        Open NextStep AI to review the
                        update and take the next action.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding: 20px 32px;
                        border-top: 1px solid #e5e7eb;
                        color: #6b7280;
                        font-size: 12px;
                        line-height: 1.5;
                      "
                    >
                      This is an automated reminder from
                      NextStep AI. This email was not sent
                      to the recruiter.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private getFromAddress(): string {
    return (
      this.configService.get<string>('EMAIL_FROM') ||
      `NextStep AI <${this.configService.get<string>('EMAIL_USER')}>`
    );
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };

      return entities[character] || character;
    });
  }
}
