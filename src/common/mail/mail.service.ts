import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { googleConnectOtpTemplate } from './templates/google-connect-otp.template';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host =
      this.configService.get<string>('EMAIL_HOST') || 'smtp.gmail.com';

    const port = Number(
      this.configService.get<string>('EMAIL_PORT') || 587,
    );

    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASS');

    if (!user || !pass) {
      throw new BadRequestException(
        'EMAIL_USER and EMAIL_PASS are required',
      );
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
  ) {
    const from =
      this.configService.get<string>('EMAIL_FROM') ||
      `NextStep AI <${this.configService.get<string>('EMAIL_USER')}>`;

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Your NextStep AI verification code',
        text: `Hi ${firstName || 'there'}, your NextStep AI verification code is ${otp}. This code expires in 10 minutes.`,
        html: googleConnectOtpTemplate({
          firstName,
          email: to,
          otp,
          expiryMinutes: 10,
        }),
      });

      return true;
    } catch (error) {
      console.log('MAIL_SEND_ERROR:', error);

      throw new InternalServerErrorException(
        'Unable to send verification email',
      );
    }
  }

  async sendTestEmail(to: string) {
    const from =
      this.configService.get<string>('EMAIL_FROM') ||
      `NextStep AI <${this.configService.get<string>('EMAIL_USER')}>`;

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'NextStep AI SMTP Test',
        text: 'SMTP is working. This is a test email from NextStep AI backend.',
        html: `
          <h2>SMTP is working ✅</h2>
          <p>This is a test email from NextStep AI backend.</p>
        `,
      });

      return {
        success: true,
        message: 'Test email sent successfully',
      };
    } catch (error) {
      console.log('MAIL_TEST_ERROR:', error);

      throw new InternalServerErrorException(
        'Unable to send test email',
      );
    }
  }
}