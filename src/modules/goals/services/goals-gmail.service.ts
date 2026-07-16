// src/modules/goals/services/goals-gmail.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GoalsService } from './goals.service';
import { IntegrationsService } from '../../integrations/integrations.service';
import { GoalTemplateKey } from '../enums/goals.enum';
import { Goal, GoalDocument } from '../schemas/goal.schema';
import { GoalGmailIntelligenceService } from './goal-gmail-intelligence.service';

@Injectable()
export class GoalsGmailService {
  constructor(
    @InjectModel(Goal.name)
    private readonly goalModel: Model<GoalDocument>,

    private readonly goalsService: GoalsService,

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

    const userObjectId = new Types.ObjectId(userId);
    const goalObjectId = new Types.ObjectId(goalId);

    const goal = await this.goalModel.findOne({
      _id: goalObjectId,
      userId: userObjectId,
    });

    if (!goal) {
      throw new BadRequestException('Goal not found');
    }

    if (goal.templateKey !== GoalTemplateKey.JOB_SEARCH) {
      throw new BadRequestException(
        'Gmail intelligence is only available for job search goals',
      );
    }

    const targetRole = goal.setupAnswers?.targetRole?.toLowerCase()?.trim();

    if (!targetRole) {
      throw new BadRequestException('Target role not configured for this goal');
    }

    const goalCreatedAt = new Date((goal as any).createdAt);

    /*
     * On later syncs, scan again from five minutes before the last sync
     * so delayed Gmail messages are not missed.
     *
     * On the first sync, only scan emails created after the goal.
     */
    const syncFrom = goal.lastIntelligenceSyncAt
      ? new Date(
          new Date(goal.lastIntelligenceSyncAt).getTime() - 5 * 60 * 1000,
        )
      : goalCreatedAt;

    const emailsResponse =
      await this.integrationsService.getGoogleGmailMessages(
        userId,
        undefined,
        undefined,
        '50',
        undefined,
        undefined,
        '30',
        syncFrom,
      );

    const emails = emailsResponse?.data || [];

    const relevantEmails = emails.filter((email) => {
      const isJobEmail =
        this.goalGmailIntelligenceService.isPotentialJobSearchEmail(email);

      const content = `
        ${email.from || ''}
        ${email.to || ''}
        ${email.subject || ''}
        ${email.snippet || ''}
        ${email.body || ''}
      `.toLowerCase();

      const matchesRole = content.includes(targetRole);

      const emailDate = email.receivedAt ? new Date(email.receivedAt) : null;

      const isAfterSyncStart = !emailDate || emailDate >= syncFrom;

      return isAfterSyncStart && (isJobEmail || matchesRole);
    });

    /*
     * Sent emails are processed before incoming bounce notifications.
     * This allows the cold-email record to be created before its
     * corresponding bounce is processed.
     */
    const processingEmails = [...relevantEmails].sort((first, second) => {
      const firstIsSent = first.labelIds?.includes('SENT') || false;

      const secondIsSent = second.labelIds?.includes('SENT') || false;

      if (firstIsSent !== secondIsSent) {
        return firstIsSent ? -1 : 1;
      }

      const firstTime = first.receivedAt
        ? new Date(first.receivedAt).getTime()
        : 0;

      const secondTime = second.receivedAt
        ? new Date(second.receivedAt).getTime()
        : 0;

      return firstTime - secondTime;
    });

    const results: any[] = [];

    let detectedApplications = 0;
    let detectedColdEmails = 0;
    let detectedReplies = 0;
    let detectedInterviews = 0;
    let detectedOffers = 0;
    let detectedRejections = 0;
    let detectedBounces = 0;
    let duplicateEvents = 0;

    const registerResult = (
      result: any,
      incrementNewEvent: () => void,
    ): boolean => {
      if (!result) {
        return false;
      }

      results.push(result);

      if (result.duplicate) {
        duplicateEvents++;
      } else {
        incrementNewEvent();
      }

      return true;
    };

    for (const email of processingEmails) {
      const payload = {
        userId: userObjectId,
        goalId: goalObjectId,

        messageId: email.id,
        threadId: email.threadId,

        from: email.from,
        to: email.to,

        subject: email.subject,
        snippet: email.snippet,
        body: email.body,

        labelIds: email.labelIds,
        receivedAt: email.receivedAt,

        targetRole,
      };

      const bounceResult =
        await this.goalGmailIntelligenceService.detectBounceEmail(payload);

      if (registerResult(bounceResult, () => detectedBounces++)) {
        continue;
      }

      const coldEmailResult =
        await this.goalGmailIntelligenceService.detectColdEmail(payload);

      if (registerResult(coldEmailResult, () => detectedColdEmails++)) {
        continue;
      }

      const offerResult =
        await this.goalGmailIntelligenceService.detectOfferEmail(payload);

      if (registerResult(offerResult, () => detectedOffers++)) {
        continue;
      }

      const rejectionResult =
        await this.goalGmailIntelligenceService.detectRejectionEmail(payload);

      if (registerResult(rejectionResult, () => detectedRejections++)) {
        continue;
      }

      const interviewResult =
        await this.goalGmailIntelligenceService.detectInterviewEmail(payload);

      if (registerResult(interviewResult, () => detectedInterviews++)) {
        continue;
      }

      const replyResult =
        await this.goalGmailIntelligenceService.detectRecruiterReplyEmail(
          payload,
        );

      if (registerResult(replyResult, () => detectedReplies++)) {
        continue;
      }

      const applicationResult =
        await this.goalGmailIntelligenceService.detectApplicationEmail(payload);

      registerResult(applicationResult, () => detectedApplications++);
    }

    goal.lastIntelligenceSyncAt = new Date();
    await goal.save();

    const autoCompletedTasks =
      await this.goalsService.syncAutomaticDailyTaskCompletion(userId, goalId);

    return {
      message: 'Gmail intelligence sync completed',
      goalId,
      goalType: goal.goalType,
      targetRole,

      scannedEmails: emails.length,
      relevantEmails: relevantEmails.length,

      detectedApplications,
      detectedColdEmails,
      detectedReplies,
      detectedInterviews,
      detectedOffers,
      detectedRejections,
      detectedBounces,

      duplicateEvents,
      results,
    };
  }
}
