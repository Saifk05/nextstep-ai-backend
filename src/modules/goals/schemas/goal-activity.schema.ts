// src/modules/goals/schemas/goal-activity.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ActivityType } from '../enums/goals.enum';

export type GoalActivityDocument = HydratedDocument<GoalActivity>;

@Schema({ timestamps: true })
export class GoalActivity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Goal', required: true, index: true })
  goalId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Recruiter' })
  recruiterId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ActivityType,
    required: true,
    index: true,
  })
  type: ActivityType;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const GoalActivitySchema = SchemaFactory.createForClass(GoalActivity);

GoalActivitySchema.index({ userId: 1, goalId: 1, createdAt: -1 });
