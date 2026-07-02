// src/modules/goals/schemas/goal-plan.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GoalPlanDocument = HydratedDocument<GoalPlan>;

export type GoalPlanItem = {
  _id?: Types.ObjectId;
  title: string;
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
    type: [
      {
        title: {
          type: String,
          required: true,
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
  dailyActions: GoalPlanItem[];

  @Prop({
    type: [
      {
        title: {
          type: String,
          required: true,
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
  weeklyActions: GoalPlanItem[];

  @Prop({
    type: [
      {
        title: {
          type: String,
          required: true,
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
  milestones: GoalPlanItem[];

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