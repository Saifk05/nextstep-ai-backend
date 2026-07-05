import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

import { GoalIntelligenceService } from './goal-intelligence.service';

@Injectable()
export class GoalGmailIntelligenceService {
  constructor(
    private readonly goalIntelligenceService: GoalIntelligenceService,
  ) {}

  async detectApplicationEmail(params: {
    userId: Types.ObjectId;
    goalId: Types.ObjectId;
    messageId: string;
    threadId?: string;
    from?: string;
    subject?: string;
    snippet?: string;
    body?: string;
  }) {
    const text = `${params.subject ?? ''} ${params.snippet ?? ''} ${
      params.body ?? ''
    }`.toLowerCase();

    const applicationPatterns = [
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

    const isApplicationDetected = applicationPatterns.some((pattern) =>
      text.includes(pattern),
    );

    if (!isApplicationDetected) {
      return null;
    }

    const company = this.extractCompanyName(params.from, params.subject);

    return this.goalIntelligenceService.createApplicationDetectedEvent({
      userId: params.userId,
      goalId: params.goalId,
      company,
      sourceMessageId: params.messageId,
      sourceThreadId: params.threadId,
      sourceEmailFrom: params.from,
      sourceEmailSubject: params.subject,
      confidenceScore: 90,
      metadata: {
        snippet: params.snippet,
        detectedBy: 'APPLICATION_KEYWORD_MATCH',
      },
    });
  }

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

//   private extractCompanyName(from?: string, subject?: string): string {
//     if (from) {
//         const domainMatch = from.match(/@([^>\s]+)/);

//         if (domainMatch?.[1]) {
//         const fullDomain = domainMatch[1].toLowerCase();
//         const domain = fullDomain.split('.')[0];

//         const personalDomains = [
//             'gmail',
//             'googlemail',
//             'yahoo',
//             'outlook',
//             'hotmail',
//             'icloud',
//         ];

//         if (!personalDomains.includes(domain)) {
//             return this.capitalize(domain);
//         }
//         }

//         const displayNameMatch = from.match(/^"?([^"<]+)"?\s*</);

//         if (displayNameMatch?.[1]) {
//         const displayName = displayNameMatch[1].trim();

//         if (displayName) {
//             return displayName;
//         }
//         }
//     }

//     if (subject) {
//         return subject.slice(0, 80);
//     }

//     return 'Unknown Company';
//     }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
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
    'recruiter',
    'hiring',
    'hr',
    'shortlisted',
    'selected',
    'offer letter',
    'backend developer',
    'software engineer',
  ];

  return allowedKeywords.some((keyword) => text.includes(keyword));
}

async detectInterviewEmail(params: {
  userId: Types.ObjectId;
  goalId: Types.ObjectId;
  messageId: string;
  threadId?: string;
  from?: string;
  subject?: string;
  snippet?: string;
  body?: string;
}) {
  const text = `${params.subject ?? ''} ${params.snippet ?? ''} ${
    params.body ?? ''
  }`.toLowerCase();

  const interviewPatterns = [
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
  ];

  const isInterviewDetected = interviewPatterns.some((pattern) =>
    text.includes(pattern),
  );

  if (!isInterviewDetected) {
    return null;
  }

  const company = this.extractCompanyName(params.from, params.subject);

  return this.goalIntelligenceService.createInterviewDetectedEvent({
    userId: params.userId,
    goalId: params.goalId,
    company,
    sourceMessageId: params.messageId,
    sourceThreadId: params.threadId,
    sourceEmailFrom: params.from,
    sourceEmailSubject: params.subject,
    confidenceScore: 95,
    metadata: {
      snippet: params.snippet,
      detectedBy: 'INTERVIEW_KEYWORD_MATCH',
    },
  });
}
}