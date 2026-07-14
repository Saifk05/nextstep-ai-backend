// src/modules/goals/services/goal-intelligence.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ActivityType,
  ApplicationStatus,
  GoalIntelligenceEventType,
  RecruiterStatus,
} from '../enums/goals.enum';

import {
  Recruiter,
  RecruiterDocument,
} from '../schemas/recruiter.schema';

import { Goal, GoalDocument } from '../schemas/goal.schema';
import {
  GoalActivity,
  GoalActivityDocument,
} from '../schemas/goal-activity.schema';
import {
  GoalApplication,
  GoalApplicationDocument,
} from '../schemas/goal-application.schema';
import {
  GoalIntelligenceEvent,
  GoalIntelligenceEventDocument,
} from '../schemas/goal-intelligence-event.schema';

type IntelligenceParams = {
  userId: Types.ObjectId;
  goalId: Types.ObjectId;

  company: string;
  position?: string;

  recipientEmail?: string;

  sourceMessageId?: string;
  sourceThreadId?: string;
  sourceEmailFrom?: string;
  sourceEmailSubject?: string;

  confidenceScore: number;
  metadata?: Record<string, any>;
};

@Injectable()
export class GoalIntelligenceService {
  constructor(
    @InjectModel(Goal.name)
    private readonly goalModel: Model<GoalDocument>,

    @InjectModel(GoalActivity.name)
    private readonly goalActivityModel: Model<GoalActivityDocument>,

    @InjectModel(GoalApplication.name)
    private readonly goalApplicationModel: Model<GoalApplicationDocument>,

    @InjectModel(GoalIntelligenceEvent.name)
    private readonly goalIntelligenceEventModel: Model<GoalIntelligenceEventDocument>,

    @InjectModel(Recruiter.name)
    private readonly recruiterModel: Model<RecruiterDocument>,
  ) {}


  
  async createApplicationDetectedEvent(params: IntelligenceParams) {
    const existingEvent = await this.findDuplicateEvent(
      params,
      GoalIntelligenceEventType.APPLICATION_DETECTED,
    );

    if (existingEvent) {
      return this.duplicateResponse(existingEvent, ActivityType.APPLICATION_DETECTED);
    }

    const now = new Date();

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
      appliedAt: now,
      lastActivityAt: now,
      confidenceScore: params.confidenceScore,
      metadata: params.metadata ?? {},
    });

    const event = await this.createEvent(
      params,
      GoalIntelligenceEventType.APPLICATION_DETECTED,
      application._id as Types.ObjectId,
    );

    await this.goalModel.updateOne(
      { _id: params.goalId, userId: params.userId },
      { $inc: { 'metrics.applicationsSubmitted': 1 } },
    );

    await this.updateGoalProgress(params.goalId);


    await this.createActivity(
      params,
      ActivityType.APPLICATION_DETECTED,
      `Applied to ${params.company}`,
      event._id as Types.ObjectId,
      application._id as Types.ObjectId,
    );

    return {
      application,
      event,
      activityType: ActivityType.APPLICATION_DETECTED,
      duplicate: false,
    };
  }

  async createRecruiterReplyDetectedEvent(params: IntelligenceParams) {
    return this.createStatusEvent({
      params,
      eventType: GoalIntelligenceEventType.RECRUITER_REPLY_DETECTED,
      activityType: ActivityType.REPLY_DETECTED,
      applicationStatus: ApplicationStatus.REPLIED,
      metricKey: 'metrics.replies',
      message: `Recruiter replied from ${params.company}`,
    });
  }

async createColdEmailDetectedEvent(
  params: IntelligenceParams,
) {
  const recruiter =
    await this.upsertRecruiterFromColdEmail(params);

  const existingEvent = await this.findDuplicateEvent(
    params,
    GoalIntelligenceEventType.COLD_EMAIL_DETECTED,
  );

  if (existingEvent) {
    const duplicate = await this.duplicateResponse(
      existingEvent,
      ActivityType.COLD_EMAIL_DETECTED,
    );

    return {
      ...duplicate,
      recruiter,
    };
  }

  const event = await this.createEvent(
    params,
    GoalIntelligenceEventType.COLD_EMAIL_DETECTED,
  );

  await this.goalModel.updateOne(
    {
      _id: params.goalId,
      userId: params.userId,
    },
    {
      $inc: {
        'metrics.emailsSent': 1,
      },
    },
  );

  await this.updateGoalProgress(params.goalId);

  await this.createActivity(
    params,
    ActivityType.COLD_EMAIL_DETECTED,
    `Cold email sent to ${params.company}`,
    event._id as Types.ObjectId,
    undefined,
    recruiter?._id as Types.ObjectId | undefined,
  );

  return {
    recruiter,
    event,
    activityType:
      ActivityType.COLD_EMAIL_DETECTED,
    duplicate: false,
  };
}

async createEmailBouncedEvent(params: IntelligenceParams) {
  const existingEvent = await this.findDuplicateEvent(
    params,
    GoalIntelligenceEventType.EMAIL_BOUNCED,
  );

  if (existingEvent) {
    return this.duplicateResponse(
      existingEvent,
      ActivityType.EMAIL_BOUNCED,
    );
  }

  const event = await this.createEvent(
    params,
    GoalIntelligenceEventType.EMAIL_BOUNCED,
  );

  await this.goalModel.updateOne(
    { _id: params.goalId, userId: params.userId },
    {
      $inc: {
        'metrics.bouncedEmails': 1,
      },
    },
  );

  await this.updateGoalProgress(params.goalId);

  await this.createActivity(
    params,
    ActivityType.EMAIL_BOUNCED,
    `Email bounced for ${params.company}`,
    event._id as Types.ObjectId,
  );

  return {
    event,
    activityType: ActivityType.EMAIL_BOUNCED,
    duplicate: false,
  };
}

  async createInterviewDetectedEvent(params: IntelligenceParams) {
    return this.createStatusEvent({
      params,
      eventType: GoalIntelligenceEventType.INTERVIEW_DETECTED,
      activityType: ActivityType.INTERVIEW_DETECTED,
      applicationStatus: ApplicationStatus.INTERVIEW,
      metricKey: 'metrics.interviews',
      message: `Interview scheduled with ${params.company}`,
    });
  }

  async createOfferDetectedEvent(params: IntelligenceParams) {
    return this.createStatusEvent({
      params,
      eventType: GoalIntelligenceEventType.OFFER_DETECTED,
      activityType: ActivityType.OFFER_DETECTED,
      applicationStatus: ApplicationStatus.OFFER,
      metricKey: 'metrics.offers',
      message: `Offer received from ${params.company}`,
    });
  }

  async createNoResponseDetectedEvent(params: IntelligenceParams) {
    return this.createStatusEvent({
        params,
        eventType: GoalIntelligenceEventType.NO_RESPONSE_DETECTED,
        activityType: ActivityType.NO_RESPONSE_DETECTED,
        applicationStatus: ApplicationStatus.REJECTED,
        metricKey: 'metrics.rejections',
        message: `No response received after 30 days from ${params.company}`,
    });
    }

  async createRejectionDetectedEvent(params: IntelligenceParams) {
    return this.createStatusEvent({
      params,
      eventType: GoalIntelligenceEventType.REJECTION_DETECTED,
      activityType: ActivityType.REJECTION_DETECTED,
      applicationStatus: ApplicationStatus.REJECTED,
      metricKey: 'metrics.rejections',
      message: `Application rejected by ${params.company}`,
    });
  }

  private async createStatusEvent(config: {
    params: IntelligenceParams;
    eventType: GoalIntelligenceEventType;
    activityType: ActivityType;
    applicationStatus: ApplicationStatus;
    metricKey: string;
    message: string;
  }) {
    const { params } = config;

    const existingEvent = await this.findDuplicateEvent(params, config.eventType);

    if (existingEvent) {
      return this.duplicateResponse(existingEvent, config.activityType);
    }

    const application = await this.findOrCreateApplication(params);

    const updatedApplication =
    await this.goalApplicationModel.findByIdAndUpdate(
        application._id,
        {
        $set: {
            status: config.applicationStatus,
            lastActivityAt: new Date(),
        },
        },
        { new: true },
    );

    const event = await this.createEvent(
      params,
      config.eventType,
      application._id as Types.ObjectId,
    );

    await this.goalModel.updateOne(
      { _id: params.goalId, userId: params.userId },
      { $inc: { [config.metricKey]: 1 } },
    );

    await this.updateGoalProgress(params.goalId);

    await this.createActivity(
      params,
      config.activityType,
      config.message,
      event._id as Types.ObjectId,
      application._id as Types.ObjectId,
    );

    return {
        application: updatedApplication,
        event,
        activityType: config.activityType,
        duplicate: false,
    };
  }

  private async findDuplicateEvent(
    params: IntelligenceParams,
    eventType: GoalIntelligenceEventType,
  ) {
    if (!params.sourceMessageId) {
      return null;
    }

    return this.goalIntelligenceEventModel
      .findOne({
        userId: params.userId,
        goalId: params.goalId,
        sourceMessageId: params.sourceMessageId,
        eventType,
      })
      .exec();
  }

  private async findOrCreateApplication(params: IntelligenceParams) {
    const existingApplication = await this.goalApplicationModel
      .findOne({
        userId: params.userId,
        goalId: params.goalId,
        company: params.company,
        position: params.position ?? null,

      })
      .sort({ createdAt: -1 })
      .exec();

    if (existingApplication) {
      return existingApplication;
    }

    const now = new Date();

    return this.goalApplicationModel.create({
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
      appliedAt: now,
      lastActivityAt: now,
      confidenceScore: params.confidenceScore,
      metadata: {
        ...(params.metadata ?? {}),
        inferredApplication: true,
      },
    });
  }

  private async upsertRecruiterFromColdEmail(
  params: IntelligenceParams,
) {
  const recruiterEmail =
    params.recipientEmail
      ?.trim()
      .toLowerCase();

  if (!recruiterEmail) {
    return null;
  }

  const recruiterName =
    this.getRecruiterNameFromEmail(
      recruiterEmail,
    );

  const now = new Date();

  const update: any = {
    $set: {
      userId: params.userId,
      goalId: params.goalId,
      company: params.company,
      recruiterName,
      recruiterEmail,
      status: RecruiterStatus.EMAIL_SENT,
      lastEmailSentAt: now,
    },

    $setOnInsert: {
      firstEmailSentAt: now,
    },
  };

  if (params.position) {
    update.$set.position = params.position;
  }

  if (params.sourceThreadId) {
    update.$set.gmailThreadId =
      params.sourceThreadId;
  }

  if (params.sourceMessageId) {
    update.$addToSet = {
      gmailMessageIds:
        params.sourceMessageId,
    };
  }

  return this.recruiterModel.findOneAndUpdate(
    {
      goalId: params.goalId,
      recruiterEmail,
    },
    update,
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
}

private getRecruiterNameFromEmail(
  email: string,
): string {
  const localPart =
    email.split('@')[0] || '';

  const name = localPart
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1).toLowerCase(),
    )
    .join(' ');

  return name || 'Unknown Recruiter';
}

  private async createEvent(
    params: IntelligenceParams,
    eventType: GoalIntelligenceEventType,
    applicationId?: Types.ObjectId,
  ) {
    return this.goalIntelligenceEventModel.create({
      userId: params.userId,
      goalId: params.goalId,
      applicationId: applicationId ?? null,
      eventType,
      source: 'GMAIL',
      sourceMessageId: params.sourceMessageId ?? null,
      sourceThreadId: params.sourceThreadId ?? null,
      sourceEmailFrom: params.sourceEmailFrom ?? null,
      sourceEmailSubject: params.sourceEmailSubject ?? null,
      company: params.company,
      position: params.position ?? null,
      confidenceScore: params.confidenceScore,
      processed: true,
      processedAt: new Date(),
      metadata: params.metadata ?? {},
    });
  }


  private async createActivity(
  params: IntelligenceParams,
  type: ActivityType,
  message: string,
  eventId: Types.ObjectId,
  applicationId?: Types.ObjectId,
  recruiterId?: Types.ObjectId,
) {
  return this.goalActivityModel.create({
    userId: params.userId,
    goalId: params.goalId,

    recruiterId: recruiterId ?? undefined,

    type,
    message,

    metadata: {
      company: params.company,
      position: params.position ?? null,

      recipientEmail:
        params.recipientEmail ?? null,

      recruiterId:
        recruiterId?.toString() ?? null,

      source: 'GMAIL',

      sourceMessageId:
        params.sourceMessageId ?? null,

      sourceThreadId:
        params.sourceThreadId ?? null,

      sourceEmailFrom:
        params.sourceEmailFrom ?? null,

      sourceEmailSubject:
        params.sourceEmailSubject ?? null,

      eventId: eventId.toString(),

      applicationId:
        applicationId?.toString() ?? null,
    },
  });
}

  private async duplicateResponse(
    existingEvent: GoalIntelligenceEventDocument,
    activityType: ActivityType,
  ) {
    const existingApplication = existingEvent.applicationId
      ? await this.goalApplicationModel.findById(existingEvent.applicationId).exec()
      : null;

    return {
      application: existingApplication,
      event: existingEvent,
      activityType,
      duplicate: true,
    };
  }

  private async updateGoalProgress(goalId: Types.ObjectId) {
  const goal = await this.goalModel.findById(goalId);

  if (!goal) {
    return;
  }

  const metrics = goal.metrics ?? {
    applicationsSubmitted: 0,
    replies: 0,
    interviews: 0,
    offers: 0,
  };
  // const metrics = goal.metrics ?? {};

  const progress = Math.min(
    100,
    (metrics.applicationsSubmitted || 0) * 1 +
    (metrics.replies || 0) * 3 +
    (metrics.interviews || 0) * 10 +
    (metrics.offers || 0) * 50,
  );

  await this.goalModel.updateOne(
    { _id: goalId },
    {
      $set: {
        progressPercentage: progress,
      },
    },
  );
}
  
}