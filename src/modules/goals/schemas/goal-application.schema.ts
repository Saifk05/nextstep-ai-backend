import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { ApplicationStatus } from '../enums/goals.enum';

export type GoalApplicationDocument = HydratedDocument<GoalApplication>;

@Schema({ timestamps: true })
export class GoalApplication {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Goal', required: true, index: true })
  goalId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  company: string;

  @Prop({ default: null, trim: true })
  position?: string;

  @Prop({
    required: true,
    enum: ApplicationStatus,
    default: ApplicationStatus.APPLIED,
    index: true,
  })
  status: ApplicationStatus;

  @Prop({ default: null })
  source?: string;

  @Prop({ default: null })
  sourceMessageId?: string;

  @Prop({ default: null })
  sourceThreadId?: string;

  @Prop({ default: null })
  sourceEmailFrom?: string;

  @Prop({ default: null })
  sourceEmailSubject?: string;

  @Prop({ default: null })
  appliedAt?: Date;

  @Prop({ default: null })
  lastActivityAt?: Date;

  @Prop({ default: null })
  followUpDueAt?: Date;

  @Prop({ default: null })
  noResponseAt?: Date;

  @Prop({ default: 0 })
  confidenceScore: number;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const GoalApplicationSchema =
  SchemaFactory.createForClass(GoalApplication);

GoalApplicationSchema.index(
  { userId: 1, goalId: 1, company: 1, position: 1 },
  { unique: false },
);

GoalApplicationSchema.index({
  userId: 1,
  goalId: 1,
  status: 1,
});
