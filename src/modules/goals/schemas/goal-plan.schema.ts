// src/modules/goals/schemas/goal-plan.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import {
  GoalActionFrequency,
  GoalActionPriority,
} from '../enums/goals.enum';

export type GoalPlanDocument = HydratedDocument<GoalPlan>;

export type GoalPlanAction = {
  _id?: Types.ObjectId;

  key: string;

  title: string;

  description?: string;

  frequency: GoalActionFrequency;

  priority: GoalActionPriority;

  successCriteria?: string;

  actionType?: string;

  completed: boolean;

  completedAt?: Date;

  metadata?: Record<string, any>;
};

export type GoalMilestone = {
  _id?: Types.ObjectId;

  key: string;

  title: string;

  description?: string;

  weight: number;

  completed: boolean;

  completedAt?: Date;
};

@Schema({ timestamps: true })
export class GoalPlan {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Goal', required: true, index: true })
  goalId: Types.ObjectId;

  @Prop({
    type: Number,
    default: 1,
  })
  version: number;

  @Prop({
    type: [
      {
        key: {
          type: String,
          required: true,
        },

        title: {
          type: String,
          required: true,
        },

        description: {
          type: String,
        },

        frequency: {
          type: String,
          enum: GoalActionFrequency,
          default: GoalActionFrequency.ONCE,
        },

        priority: {
          type: String,
          enum: GoalActionPriority,
          default: GoalActionPriority.MEDIUM,
        },

        successCriteria: {
          type: String,
        },

        actionType: {
          type: String,
        },

        completed: {
          type: Boolean,
          default: false,
        },

        completedAt: {
          type: Date,
        },

        metadata: {
          type: Object,
          default: {},
        },
      },
    ],
    default: [],
  })
  actions: GoalPlanAction[];

  @Prop({
    type: [
      {
        key: {
          type: String,
          required: true,
        },

        title: {
          type: String,
          required: true,
        },

        description: {
          type: String,
        },

        weight: {
          type: Number,
          default: 0,
        },

        completed: {
          type: Boolean,
          default: false,
        },

        completedAt: {
          type: Date,
        },
      },
    ],
    default: [],
  })
  milestones: GoalMilestone[];

  /*
  |--------------------------------------------------------------------------
  | Legacy Compatibility
  |--------------------------------------------------------------------------
  | Keep temporarily so current frontend doesn't break
  */

  @Prop({ type: [Object], default: [] })
  dailyActions: any[];

  @Prop({ type: [Object], default: [] })
  weeklyActions: any[];

  @Prop({ type: [Object], default: [] })
  legacyMilestones: any[];

  @Prop({ trim: true })
  strategySummary?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const GoalPlanSchema = SchemaFactory.createForClass(GoalPlan);

GoalPlanSchema.index({
  userId: 1,
  goalId: 1,
  isActive: 1,
});

GoalPlanSchema.index({
  goalId: 1,
  version: -1,
});