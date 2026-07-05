// src/modules/goals/services/goal-intelligence-cron.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Goal, GoalDocument } from '../schemas/goal.schema';
import {
  GoalApplication,
  GoalApplicationDocument,
} from '../schemas/goal-application.schema';
import {
  GoalIntelligenceEvent,
  GoalIntelligenceEventDocument,
} from '../schemas/goal-intelligence-event.schema';

import {
  ApplicationStatus,
  GoalIntelligenceEventType,
  GoalStatus,
  GoalTemplateKey,
} from '../enums/goals.enum';

import { GoalsGmailService } from './goals-gmail.service';
import { GoalIntelligenceService } from './goal-intelligence.service';

@Injectable()
export class GoalIntelligenceCronService {
  private readonly logger = new Logger(GoalIntelligenceCronService.name);

  constructor(
    @InjectModel(Goal.name)
    private readonly goalModel: Model<GoalDocument>,

    @InjectModel(GoalApplication.name)
    private readonly goalApplicationModel: Model<GoalApplicationDocument>,

    @InjectModel(GoalIntelligenceEvent.name)
    private readonly goalIntelligenceEventModel: Model<GoalIntelligenceEventDocument>,

    private readonly goalsGmailService: GoalsGmailService,

    private readonly goalIntelligenceService: GoalIntelligenceService,
  ) {}

  @Cron('0 * * * *')
  async syncJobSearchGmailIntelligence() {
    this.logger.log('Goal Gmail intelligence cron started');

    const goals = await this.goalModel
      .find({
        status: GoalStatus.ACTIVE,
        templateKey: GoalTemplateKey.JOB_SEARCH,
      })
      .select('_id userId title')
      .lean();

    this.logger.log(`Job search goals found: ${goals.length}`);

    for (const goal of goals) {
      try {
        await this.goalsGmailService.syncGoalGmail(
          goal.userId.toString(),
          goal._id.toString(),
        );

        await this.goalModel.updateOne(
          { _id: goal._id },
          { $set: { lastIntelligenceSyncAt: new Date() } },
        );
      } catch (error) {
        this.logger.error(
          `Gmail intelligence sync failed for goal ${goal._id}`,
        );
        this.logger.error(error?.message || error);
      }
    }

    this.logger.log('Goal Gmail intelligence cron completed');
  }

  @Cron('0 2 * * *')
  async markNoResponseApplications() {
    this.logger.log('30-day no-response cron started');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const applications = await this.goalApplicationModel
      .find({
        status: ApplicationStatus.APPLIED,
        appliedAt: { $lte: cutoffDate },
      })
      .lean();

    this.logger.log(`No-response candidates found: ${applications.length}`);

    for (const application of applications) {
      try {
        const hasProgressEvent = await this.goalIntelligenceEventModel.exists({
          userId: application.userId,
          goalId: application.goalId,
          applicationId: application._id,
          eventType: {
            $in: [
              GoalIntelligenceEventType.RECRUITER_REPLY_DETECTED,
              GoalIntelligenceEventType.INTERVIEW_DETECTED,
              GoalIntelligenceEventType.OFFER_DETECTED,
              GoalIntelligenceEventType.REJECTION_DETECTED,
              GoalIntelligenceEventType.NO_RESPONSE_DETECTED,
            ],
          },
        });

        if (hasProgressEvent) {
          continue;
        }

        await this.goalIntelligenceService.createNoResponseDetectedEvent({
          userId: application.userId as Types.ObjectId,
          goalId: application.goalId as Types.ObjectId,
          company: application.company,
          position: application.position,
          sourceMessageId: `NO_RESPONSE_${application._id.toString()}`,
          sourceThreadId: application.sourceThreadId,
          sourceEmailFrom: application.sourceEmailFrom,
          sourceEmailSubject: application.sourceEmailSubject,
          confidenceScore: 100,
          metadata: {
            reason: 'NO_RESPONSE_30_DAYS',
            applicationId: application._id.toString(),
            appliedAt: application.appliedAt,
          },
        });

        await this.goalApplicationModel.updateOne(
          { _id: application._id },
          {
            $set: {
              status: ApplicationStatus.REJECTED,
              noResponseAt: new Date(),
              lastActivityAt: new Date(),
            },
          },
        );
      } catch (error) {
        this.logger.error(
          `No-response processing failed for application ${application._id}`,
        );
        this.logger.error(error?.message || error);
      }
    }

    this.logger.log('30-day no-response cron completed');
  }
}