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
  subject?: string;
  snippet?: string;
  body?: string;
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
      'delivery',
      'delivered',
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
    return `${params.subject ?? ''} ${params.snippet ?? ''} ${
      params.body ?? ''
    }`.toLowerCase();
  }

  private buildEventPayload(
    params: GmailDetectionParams,
    confidenceScore: number,
    detectedBy: string,
  ) {
    return {
      userId: params.userId,
      goalId: params.goalId,
      company: this.extractCompanyName(params.from, params.subject),
      sourceMessageId: params.messageId,
      sourceThreadId: params.threadId,
      sourceEmailFrom: params.from,
      sourceEmailSubject: params.subject,
      confidenceScore,
      metadata: {
        snippet: params.snippet,
        detectedBy,
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