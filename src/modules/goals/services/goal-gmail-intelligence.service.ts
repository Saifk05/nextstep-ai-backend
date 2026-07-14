// src/modules/goals/services/goal-gmail-intelligence.service.ts

import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

import { GoalIntelligenceService } from './goal-intelligence.service';

type GmailDetectionParams = {
  userId: Types.ObjectId;
  goalId: Types.ObjectId;

  messageId: string;
  threadId?: string;

  from?: string;
  to?: string;

  subject?: string;
  snippet?: string;
  body?: string;

  labelIds?: string[];
  receivedAt?: string | Date | null;

  targetRole?: string;
};


@Injectable()
export class GoalGmailIntelligenceService {
  constructor(
    private readonly goalIntelligenceService: GoalIntelligenceService,
  ) {}

  async detectApplicationEmail(params: GmailDetectionParams) {
    const text = this.buildSearchText(params);

    const patterns = [
      'thank you for applying',
      'thanks for applying',
      'application received',
      'we received your application',
      'your application has been submitted',
      'application has been submitted',
      'your application was submitted',
      'we have received your application',
      'application successfully submitted',
      'successfully submitted your application',
      'your job application',
      'job application received',
      'we got your application',
      'we have your application',
      'your application is complete',
      'application complete',
      'thanks for your interest',
      'thank you for your interest',
      'we appreciate your interest',
      'your application for',
      'you applied to',
      'application confirmation',
    ];

    if (!this.matchesAny(text, patterns)) {
      return null;
    }

    return this.goalIntelligenceService.createApplicationDetectedEvent(
      this.buildEventPayload(params, 90, 'APPLICATION_KEYWORD_MATCH'),
    );
  }

  async detectInterviewEmail(params: GmailDetectionParams) {
    const text = this.buildSearchText(params);

    const patterns = [
      'interview schedule',
      'interview scheduled',
      'interview invitation',
      'technical interview',
      'coding interview',
      'developer interview',
      'your interview',
      'interview details',
      'google meet',
      'zoom interview',
      'hiring manager',
      'interview round',
      'next round',
      'screening call',
      'technical round',
      'hr round',
    ];

    if (!this.matchesAny(text, patterns)) {
      return null;
    }

    return this.goalIntelligenceService.createInterviewDetectedEvent(
      this.buildEventPayload(params, 95, 'INTERVIEW_KEYWORD_MATCH'),
    );
  }

  async detectRecruiterReplyEmail(params: GmailDetectionParams) {
    const text = this.buildSearchText(params);

    const patterns = [
      'thanks for reaching out',
      'thank you for reaching out',
      'we reviewed your profile',
      'reviewed your profile',
      'talent acquisition',
      'recruiter',
      'hiring team',
      'would like to discuss',
      'like to discuss',
      "let's connect",
      'lets connect',
      'can we schedule a call',
      'schedule a call',
      'quick call',
      'phone screen',
      'shortlisted',
      'your profile has been shortlisted',
      'next steps',
    ];

    const senderSignals = [
      'recruiter@',
      'talent@',
      'careers@',
      'hiring@',
      'jobs@',
      'hr@',
    ];

    const from = (params.from ?? '').toLowerCase();

    if (
      !this.matchesAny(text, patterns) &&
      !senderSignals.some((signal) => from.includes(signal))
    ) {
      return null;
    }

    return this.goalIntelligenceService.createRecruiterReplyDetectedEvent(
      this.buildEventPayload(params, 85, 'RECRUITER_REPLY_KEYWORD_MATCH'),
    );
  }

  async detectOfferEmail(params: GmailDetectionParams) {
    const text = this.buildSearchText(params);

    const patterns = [
      'offer letter',
      'job offer',
      'employment offer',
      'offer extended',
      'compensation package',
      'salary package',
      'congratulations',
      'pleased to offer',
      'happy to offer',
      'selected for the role',
      'we are delighted to offer',
    ];

    if (!this.matchesAny(text, patterns)) {
      return null;
    }

    return this.goalIntelligenceService.createOfferDetectedEvent(
      this.buildEventPayload(params, 95, 'OFFER_KEYWORD_MATCH'),
    );
  }

  

  async detectRejectionEmail(params: GmailDetectionParams) {
    const text = this.buildSearchText(params);

    const patterns = [
      'unfortunately',
      'not selected',
      'we have decided not to proceed',
      'decided not to proceed',
      'we will not be moving forward',
      'not moving forward',
      'moving forward with other candidates',
      'another candidate',
      'position has been filled',
      'position filled',
      'rejected',
      'not a match',
      'not the right fit',
      'pursue other candidates',
      'after careful consideration',
    ];

    if (!this.matchesAny(text, patterns)) {
      return null;
    }

    return this.goalIntelligenceService.createRejectionDetectedEvent(
      this.buildEventPayload(params, 90, 'REJECTION_KEYWORD_MATCH'),
    );
  }

  async detectBounceEmail(params: GmailDetectionParams) {
  const text = this.buildSearchText(params);

  const patterns = [
    'delivery has failed',
    'delivery status notification',
    'message blocked',
    'recipient address rejected',
    'undeliverable',
    'mail delivery failed',
    'address not found',
    'could not be delivered',
    'wasn\'t delivered',
    'was not delivered',
    'returned mail',
    '550 5.1.1',
    'user unknown',
    'invalid recipient',
  ];

  if (!this.matchesAny(text, patterns)) {
    return null;
  }

  const failedRecipient = this.extractFailedRecipient(params);
  const bounceReason = this.extractBounceReason(text);

  const company = failedRecipient
    ? this.extractCompanyFromEmail(failedRecipient)
    : 'Unknown Company';

  return this.goalIntelligenceService.createEmailBouncedEvent({
    ...this.buildEventPayload(
      params,
      100,
      'EMAIL_BOUNCE_DETECTED',
    ),

    company,
    position: params.targetRole,
    recipientEmail: failedRecipient ?? undefined,

    metadata: {
      snippet: params.snippet,
      detectedBy: 'EMAIL_BOUNCE_DETECTED',

      failedRecipient,
      recipientEmail: failedRecipient,
      recipientDomain:
        failedRecipient?.split('@')[1] || null,

      bounceReason,
      direction: 'INBOUND_SYSTEM',
    },
  });
}

private extractFailedRecipient(
  params: GmailDetectionParams,
): string | null {
  const text = `
    ${params.subject ?? ''}
    ${params.snippet ?? ''}
    ${params.body ?? ''}
  `;

  const specificPatterns = [
    /(?:wasn't|was not)\s+delivered\s+to\s+<?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})>?/i,

    /delivery\s+to\s+the\s+following\s+recipient(?:s)?\s+failed[\s\S]*?<?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})>?/i,

    /final-recipient:\s*rfc822;\s*<?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})>?/i,

    /recipient\s+address\s+rejected[:\s]+<?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})>?/i,

    /original-recipient:\s*rfc822;\s*<?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})>?/i,
  ];

  for (const pattern of specificPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }

const emailMatches = text.match(
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
);

const allEmails: string[] = emailMatches
  ? Array.from(emailMatches)
  : [];

const validRecipient = allEmails.find((email: string) => {
  const normalized = email.toLowerCase();

  return (
    !normalized.startsWith('mailer-daemon@') &&
    !normalized.startsWith('postmaster@') &&
    !normalized.includes('@googlemail.com')
  );
});

return validRecipient
  ? validRecipient.toLowerCase()
  : null;
}

private extractBounceReason(text: string): string {
  if (
    text.includes('address not found') ||
    text.includes('user unknown') ||
    text.includes('550 5.1.1') ||
    text.includes('invalid recipient')
  ) {
    return 'ADDRESS_NOT_FOUND';
  }

  if (
    text.includes('mailbox full') ||
    text.includes('quota exceeded')
  ) {
    return 'MAILBOX_FULL';
  }

  if (
    text.includes('message blocked') ||
    text.includes('blocked by')
  ) {
    return 'MESSAGE_BLOCKED';
  }

  if (text.includes('recipient address rejected')) {
    return 'RECIPIENT_REJECTED';
  }

  if (
    text.includes('domain not found') ||
    text.includes('domain does not exist')
  ) {
    return 'DOMAIN_NOT_FOUND';
  }

  return 'DELIVERY_FAILED';
}

private extractEmail(value?: string): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  );

  return match?.[0]?.toLowerCase() || null;
}

private extractCompanyFromEmail(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase();

  if (!domain) {
    return 'Unknown Company';
  }

  const domainName = domain.split('.')[0];

  const personalDomains = [
    'gmail',
    'googlemail',
    'yahoo',
    'outlook',
    'hotmail',
    'icloud',
    'protonmail',
  ];

  if (personalDomains.includes(domainName)) {
    return 'Unknown Company';
  }

  return domainName
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => this.capitalize(word))
    .join(' ');
}
  async detectColdEmail(params: GmailDetectionParams) {
  const isSentEmail = params.labelIds?.includes('SENT');

  if (!isSentEmail) {
    return null;
  }

  const text = this.buildSearchText(params);

  const outreachPatterns = [
    'application for',
    'opportunities at',
    'backend developer opportunities',
    'software engineer opportunities',
    'full stack developer opportunities',
    'open to opportunities',
    'referral request',
    'attached my resume',
    'resume for your review',
    'suitable openings',
    'any suitable opportunities',
  ];

  if (!this.matchesAny(text, outreachPatterns)) {
    return null;
  }

  const recipientEmail = this.extractEmail(params.to);

  if (!recipientEmail) {
    return null;
  }

  const company = this.extractCompanyFromEmail(recipientEmail);

  return this.goalIntelligenceService.createColdEmailDetectedEvent({
    ...this.buildEventPayload(
      params,
      95,
      'SENT_JOB_OUTREACH_DETECTED',
    ),

    company,
    position: params.targetRole,
    recipientEmail,

    metadata: {
      snippet: params.snippet,
      detectedBy: 'SENT_JOB_OUTREACH_DETECTED',
      recipientEmail,
      recipientDomain: recipientEmail.split('@')[1] || null,
      direction: 'OUTBOUND',
    },
  });
}

  isPotentialJobSearchEmail(email: {
    from?: string;
    subject?: string;
    snippet?: string;
  }): boolean {
    const text = `${email.subject ?? ''} ${email.from ?? ''} ${
      email.snippet ?? ''
    }`.toLowerCase();

    const blockedKeywords = [
      'order',
      'ordered',
      'shipped',
      'shipment',
      'package delivered',
      'delivery tracking',
      'shipment delivered',
      'tracking',
      'cashback',
      'amazon music',
      'nykaa',
      'flipkart',
      'myntra',
      'easemytrip',
      'payment',
      'invoice',
      'receipt',
      'newsletter',
      'unsubscribe',
      'promotion',
    ];

    if (blockedKeywords.some((keyword) => text.includes(keyword))) {
      return false;
    }

    const allowedKeywords = [
    'thank you for applying',
    'application received',
    'received your application',
    'application submitted',
    'job application',

    'undeliverable',
    'mail delivery failed',
    'delivery status notification',
    'returned mail',
    'user unknown',
    'address not found',
    'invalid recipient',


    'interview',
    'technical interview',
    'coding interview',
    'google meet',
    'zoom',

    'recruiter',
    'talent acquisition',
    'hiring',
    'hiring team',
    'hr',
    'shortlisted',
    'selected',

    'offer letter',
    'job offer',
    'employment offer',
    'compensation package',
    'congratulations',
    'pleased to offer',

    'unfortunately',
    'not selected',
    'not moving forward',
    'position filled',
    'another candidate',
    'decided not to proceed',
    'we have decided not to proceed',
    'moving forward with another candidate',
    'update on your application',
    'update on your backend developer application',

    'reviewed your profile',
    'would like to discuss',
    'like to discuss',
    'can we schedule a call',
    'schedule a call',
    'quick call',
    'phone screen',

    'backend developer',
    'software engineer',
    'developer role',
    'next steps',
    ];

    return allowedKeywords.some((keyword) => text.includes(keyword));
  }

  private buildSearchText(params: GmailDetectionParams): string {
    return `
      ${params.from ?? ''}
      ${params.to ?? ''}
      ${params.subject ?? ''}
      ${params.snippet ?? ''}
      ${params.body ?? ''}
    `.toLowerCase();
  }

  
  private isSentMessage(
    params: Pick<GmailDetectionParams, 'labelIds'>,
  ): boolean {
    return params.labelIds?.includes('SENT') ?? false;
  }

  private buildEventPayload(
    params: GmailDetectionParams,
    confidenceScore: number,
    detectedBy: string,
  ) {
    const sourceAddress = this.isSentMessage(params)
      ? params.to
      : params.from;

    return {
      userId: params.userId,
      goalId: params.goalId,

      company: this.extractCompanyName(
        sourceAddress,
        params.subject,
      ),

      position: params.targetRole,

      sourceMessageId: params.messageId,
      sourceThreadId: params.threadId,

      sourceEmailFrom: params.from,
      sourceEmailSubject: params.subject,

      confidenceScore,

      metadata: {
        snippet: params.snippet,
        detectedBy,
        direction: this.isSentMessage(params)
          ? 'OUTBOUND'
          : 'INBOUND',
        receivedAt: params.receivedAt ?? null,
      },
    };
  }

  private matchesAny(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) => text.includes(pattern));
  }

    // private extractCompanyName(from?: string, subject?: string): string {
    // if (from) {
    //     const domainMatch = from.match(/@([^>\s]+)/);

    //     if (domainMatch?.[1]) {
    //     const fullDomain = domainMatch[1].toLowerCase();
    //     const domain = fullDomain.split('.')[0];

    //     const personalDomains = [
    //         'gmail',
    //         'googlemail',
    //         'yahoo',
    //         'outlook',
    //         'hotmail',
    //         'icloud',
    //     ];

    //     if (personalDomains.includes(domain)) {
    //         return 'PERSONAL_EMAIL';
    //     }

    //     return this.capitalize(domain);
    //     }
    // }

    // return 'Unknown Company';
    // } 

    private extractCompanyName(from?: string, subject?: string): string {
  if (from) {
    const domainMatch = from.match(/@([^>\s]+)/);

    if (domainMatch?.[1]) {
      const fullDomain = domainMatch[1].toLowerCase();
      const domain = fullDomain.split('.')[0];

      const personalDomains = [
        'gmail',
        'googlemail',
        'yahoo',
        'outlook',
        'hotmail',
        'icloud',
      ];

      if (personalDomains.includes(domain)) {
        return 'Unknown Company';
      }

      return this.capitalize(domain);
    }
  }

  return 'Unknown Company';
}
  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}