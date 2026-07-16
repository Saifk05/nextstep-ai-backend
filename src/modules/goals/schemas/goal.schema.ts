// src/modules/goals/schemas/goal.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { HydratedDocument, Types } from 'mongoose';

import {
  GoalCategory,
  GoalPlanSource,
  GoalStatus,
  GoalTemplateKey,
  GoalType,
} from '../enums/goals.enum';

export type GoalDocument = HydratedDocument<Goal>;

@Schema({
  timestamps: true,
})
export class Goal {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    trim: true,
  })
  description?: string;

  @Prop({
    type: String,
    enum: GoalCategory,
    default: GoalCategory.CUSTOM,
    index: true,
  })
  category!: GoalCategory;

  @Prop({
    type: String,
    enum: GoalTemplateKey,
    default: GoalTemplateKey.CUSTOM,
    index: true,
  })
  templateKey!: GoalTemplateKey;

  @Prop({
    type: Number,
    default: 1,
  })
  templateVersion!: number;

  @Prop({
    type: Object,
    default: {},
  })
  setupAnswers!: Record<string, any>;

  @Prop({
    type: String,
    enum: GoalPlanSource,
    default: GoalPlanSource.TEMPLATE,
    index: true,
  })
  planSource!: GoalPlanSource;

  @Prop({
    type: String,
    enum: GoalType,
    default: GoalType.CUSTOM,
    index: true,
  })
  goalType!: GoalType;

  @Prop({
    required: true,
  })
  targetDate!: Date;

  @Prop({
    type: String,
    enum: GoalStatus,
    default: GoalStatus.ACTIVE,
    index: true,
  })
  status!: GoalStatus;

  @Prop({
    type: {
      emailsSent: {
        type: Number,
        default: 0,
        min: 0,
      },

      bouncedEmails: {
        type: Number,
        default: 0,
        min: 0,
      },

      replies: {
        type: Number,
        default: 0,
        min: 0,
      },

      interviews: {
        type: Number,
        default: 0,
        min: 0,
      },

      offers: {
        type: Number,
        default: 0,
        min: 0,
      },

      rejections: {
        type: Number,
        default: 0,
        min: 0,
      },

      noResponses: {
        type: Number,
        default: 0,
        min: 0,
      },

      followUpsDue: {
        type: Number,
        default: 0,
        min: 0,
      },

      applicationsSubmitted: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    default: {
      emailsSent: 0,
      bouncedEmails: 0,
      replies: 0,
      interviews: 0,
      offers: 0,
      rejections: 0,
      noResponses: 0,
      followUpsDue: 0,
      applicationsSubmitted: 0,
    },
  })
  metrics!: {
    emailsSent: number;

    bouncedEmails: number;

    replies: number;

    interviews: number;

    offers: number;

    rejections: number;

    noResponses: number;

    followUpsDue: number;

    applicationsSubmitted: number;
  };

  @Prop({
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  })
  progressPercentage!: number;

  @Prop({
    type: Date,
    default: null,
  })
  lastIntelligenceSyncAt?: Date;

  @Prop({
    trim: true,
  })
  aiPlanSummary?: string;
}

export const GoalSchema = SchemaFactory.createForClass(Goal);

GoalSchema.index({
  userId: 1,
  status: 1,
});

GoalSchema.index({
  userId: 1,
  goalType: 1,
});

GoalSchema.index({
  userId: 1,
  category: 1,
});

GoalSchema.index({
  userId: 1,
  templateKey: 1,
  lastIntelligenceSyncAt: 1,
});

GoalSchema.index(
  {
    userId: 1,
    title: 1,
  },
  {
    unique: true,
  },
);
