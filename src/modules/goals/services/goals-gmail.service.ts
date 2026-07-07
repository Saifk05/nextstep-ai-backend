// src/modules/goals/services/goals-gmail.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Goal, GoalDocument } from '../schemas/goal.schema';
import { GoalTemplateKey } from '../enums/goals.enum';
import { GoalGmailIntelligenceService } from './goal-gmail-intelligence.service';
import { IntegrationsService } from '../../integrations/integrations.service';

@Injectable()
export class GoalsGmailService {
  constructor(
    @InjectModel(Goal.name)
    private readonly goalModel: Model<GoalDocument>,

    private readonly goalGmailIntelligenceService: GoalGmailIntelligenceService,

    private readonly integrationsService: IntegrationsService,
  ) {}


  async syncGoalGmail(userId: string, goalId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new BadRequestException('Invalid user id');
  }

  if (!Types.ObjectId.isValid(goalId)) {
    throw new BadRequestException('Invalid goal id');
  }

  const goal = await this.goalModel.findOne({
    _id: new Types.ObjectId(goalId),
    userId: new Types.ObjectId(userId),
  });

  if (!goal) {
    throw new BadRequestException('Goal not found');
  }

  if (goal.templateKey !== GoalTemplateKey.JOB_SEARCH) {
    throw new BadRequestException(
      'Gmail intelligence is only available for job search goals',
    );
  }

  // console.log('Goal Setup Answers:', goal.setupAnswers);

  const targetRole =
    goal.setupAnswers?.targetRole?.toLowerCase()?.trim();

  // console.log('Target Role:', targetRole);

  if (!targetRole) {
    throw new BadRequestException(
      'Target role not configured for this goal',
    );
  }

  const goalCreatedAt = new Date((goal as any).createdAt);

  const emailsResponse = await this.integrationsService.getGoogleGmailMessages(
    userId,
    undefined,
    undefined,
    '50',
    undefined,
    undefined,
    undefined,
  );

  const emails = emailsResponse?.data || [];

  const relevantEmails = emails.filter((email) => {
    const isJobEmail =
      this.goalGmailIntelligenceService.isPotentialJobSearchEmail(email);

    const content = `
      ${email.subject || ''}
      ${email.snippet || ''}
    `.toLowerCase();

    const matchesRole = content.includes(targetRole);

    const emailDate = email.receivedAt
      ? new Date(email.receivedAt)
      : null;

    const isAfterGoalCreated =
      !emailDate || emailDate >= goalCreatedAt;

    return (
      isJobEmail &&
      matchesRole &&
      isAfterGoalCreated
    );
  });

  const results = [];

  let detectedApplications = 0;
  let detectedReplies = 0;
  let detectedInterviews = 0;
  let detectedOffers = 0;
  let detectedRejections = 0;

  for (const email of relevantEmails) {
    const payload = {
      userId: new Types.ObjectId(userId),
      goalId: new Types.ObjectId(goalId),
      messageId: email.id,
      threadId: email.threadId,
      from: email.from,
      subject: email.subject,
      snippet: email.snippet,
      body: email.snippet,
    };

    const offerResult =
      await this.goalGmailIntelligenceService.detectOfferEmail(payload);

    if (offerResult) {
      detectedOffers++;
      results.push(offerResult);
      continue;
    }

    const rejectionResult =
      await this.goalGmailIntelligenceService.detectRejectionEmail(payload);

    if (rejectionResult) {
      detectedRejections++;
      results.push(rejectionResult);
      continue;
    }

    const interviewResult =
      await this.goalGmailIntelligenceService.detectInterviewEmail(payload);

    if (interviewResult) {
      detectedInterviews++;
      results.push(interviewResult);
      continue;
    }

    const replyResult =
      await this.goalGmailIntelligenceService.detectRecruiterReplyEmail(
        payload,
      );

    if (replyResult) {
      detectedReplies++;
      results.push(replyResult);
      continue;
    }

    const applicationResult =
      await this.goalGmailIntelligenceService.detectApplicationEmail(payload);

    if (applicationResult) {
      detectedApplications++;
      results.push(applicationResult);
    }
  }

  return {
    message: 'Gmail intelligence sync completed',
    goalId,
    goalType: goal.goalType,
    targetRole,
    scannedEmails: emails.length,
    relevantEmails: relevantEmails.length,
    detectedApplications,
    detectedReplies,
    detectedInterviews,
    detectedOffers,
    detectedRejections,
    results,
  };
}
}