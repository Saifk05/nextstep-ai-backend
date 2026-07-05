import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ActivityType,
  ApplicationStatus,
  GoalIntelligenceEventType,
} from '../enums/goals.enum';

import { Goal, GoalDocument } from '../schemas/goal.schema';

import {
  GoalApplication,
  GoalApplicationDocument,
} from '../schemas/goal-application.schema';

import {
  GoalIntelligenceEvent,
  GoalIntelligenceEventDocument,
} from '../schemas/goal-intelligence-event.schema';

@Injectable()
export class GoalIntelligenceService {
  constructor(
    @InjectModel(Goal.name)
    private readonly goalModel: Model<GoalDocument>,

    @InjectModel(GoalApplication.name)
    private readonly goalApplicationModel: Model<GoalApplicationDocument>,

    @InjectModel(GoalIntelligenceEvent.name)
    private readonly goalIntelligenceEventModel: Model<GoalIntelligenceEventDocument>,
  ) {}

  async createApplicationDetectedEvent(params: {
    userId: Types.ObjectId;
    goalId: Types.ObjectId;
    company: string;
    position?: string;
    sourceMessageId?: string;
    sourceThreadId?: string;
    sourceEmailFrom?: string;
    sourceEmailSubject?: string;
    confidenceScore: number;
    metadata?: Record<string, any>;
  }) {
    if (params.sourceMessageId) {
      const existingEvent = await this.goalIntelligenceEventModel
        .findOne({
          userId: params.userId,
          goalId: params.goalId,
          sourceMessageId: params.sourceMessageId,
          eventType: GoalIntelligenceEventType.APPLICATION_DETECTED,
        })
        .exec();

      if (existingEvent) {
        const existingApplication = existingEvent.applicationId
          ? await this.goalApplicationModel
              .findById(existingEvent.applicationId)
              .exec()
          : null;

        return {
          application: existingApplication,
          event: existingEvent,
          activityType: ActivityType.APPLICATION_DETECTED,
          duplicate: true,
        };
      }
    }

    const application = await this.goalApplicationModel.create({
      userId: params.userId,
      goalId: params.goalId,
      company: params.company,
      position: params.position ?? null,
      status: ApplicationStatus.APPLIED,
      source: 'GMAIL',
      sourceMessageId: params.sourceMessageId ?? null,
      sourceThreadId: params.sourceThreadId ?? null,
      sourceEmailFrom: params.sourceEmailFrom ?? null,
      sourceEmailSubject: params.sourceEmailSubject ?? null,
      appliedAt: new Date(),
      lastActivityAt: new Date(),
      confidenceScore: params.confidenceScore,
      metadata: params.metadata ?? {},
    });

    const event = await this.goalIntelligenceEventModel.create({
      userId: params.userId,
      goalId: params.goalId,
      applicationId: application._id,
      eventType: GoalIntelligenceEventType.APPLICATION_DETECTED,
      source: 'GMAIL',
      sourceMessageId: params.sourceMessageId ?? null,
      sourceThreadId: params.sourceThreadId ?? null,
      sourceEmailFrom: params.sourceEmailFrom ?? null,
      sourceEmailSubject: params.sourceEmailSubject ?? null,
      company: params.company,
      position: params.position ?? null,
      confidenceScore: params.confidenceScore,
      processed: false,
      metadata: params.metadata ?? {},
    });

    await this.goalModel.updateOne(
      {
        _id: params.goalId,
        userId: params.userId,
      },
      {
        $inc: {
          'metrics.applicationsSubmitted': 1,
        },
      },
    );

    return {
      application,
      event,
      activityType: ActivityType.APPLICATION_DETECTED,
      duplicate: false,
    };
  }

  async createInterviewDetectedEvent(params: {
  userId: Types.ObjectId;
  goalId: Types.ObjectId;
  company: string;
  position?: string;
  sourceMessageId?: string;
  sourceThreadId?: string;
  sourceEmailFrom?: string;
  sourceEmailSubject?: string;
  confidenceScore: number;
  metadata?: Record<string, any>;
}) {
  if (params.sourceMessageId) {
    const existingEvent = await this.goalIntelligenceEventModel
      .findOne({
        userId: params.userId,
        goalId: params.goalId,
        sourceMessageId: params.sourceMessageId,
        eventType: GoalIntelligenceEventType.INTERVIEW_DETECTED,
      })
      .exec();

    if (existingEvent) {
      return {
        event: existingEvent,
        activityType: ActivityType.INTERVIEW_DETECTED,
        duplicate: true,
      };
    }
  }

  const event = await this.goalIntelligenceEventModel.create({
    userId: params.userId,
    goalId: params.goalId,
    eventType: GoalIntelligenceEventType.INTERVIEW_DETECTED,
    source: 'GMAIL',
    sourceMessageId: params.sourceMessageId ?? null,
    sourceThreadId: params.sourceThreadId ?? null,
    sourceEmailFrom: params.sourceEmailFrom ?? null,
    sourceEmailSubject: params.sourceEmailSubject ?? null,
    company: params.company,
    position: params.position ?? null,
    confidenceScore: params.confidenceScore,
    processed: false,
    metadata: params.metadata ?? {},
  });

  await this.goalModel.updateOne(
    {
      _id: params.goalId,
      userId: params.userId,
    },
    {
      $inc: {
        'metrics.interviews': 1,
      },
    },
  );

  return {
    event,
    activityType: ActivityType.INTERVIEW_DETECTED,
    duplicate: false,
  };
}

}