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

    const relevantEmails = emails.filter((email) =>
      this.goalGmailIntelligenceService.isPotentialJobSearchEmail(email),
    );

    const results = [];
      let detectedApplications = 0;
      let detectedInterviews = 0;

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

        const interviewResult =
          await this.goalGmailIntelligenceService.detectInterviewEmail(payload);

        if (interviewResult) {
          detectedInterviews++;
          results.push(interviewResult);
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
        scannedEmails: emails.length,
        relevantEmails: relevantEmails.length,
        detectedApplications,
        detectedInterviews,
        results,
      };
  }
}