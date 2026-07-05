import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { GoalIntelligenceEventType } from '../enums/goals.enum';

export type GoalIntelligenceEventDocument =
  HydratedDocument<GoalIntelligenceEvent>;

@Schema({ timestamps: true })
export class GoalIntelligenceEvent {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Goal', required: true, index: true })
  goalId: Types.ObjectId;

  @Prop({
    required: true,
    enum: GoalIntelligenceEventType,
    index: true,
  })
  eventType: GoalIntelligenceEventType;

  @Prop({ default: null })
  applicationId?: Types.ObjectId;

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
  company?: string;

  @Prop({ default: null })
  position?: string;

  @Prop({ default: 0 })
  confidenceScore: number;

  @Prop({ default: false })
  processed: boolean;

  @Prop({ default: null })
  processedAt?: Date;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const GoalIntelligenceEventSchema =
  SchemaFactory.createForClass(GoalIntelligenceEvent);

GoalIntelligenceEventSchema.index({
  userId: 1,
  goalId: 1,
  eventType: 1,
});

GoalIntelligenceEventSchema.index({
  sourceMessageId: 1,
  eventType: 1,
});

GoalIntelligenceEventSchema.index({
  applicationId: 1,
  eventType: 1,
});

GoalIntelligenceEventSchema.index({
  userId: 1,
  goalId: 1,
  sourceMessageId: 1,
  eventType: 1,
});

GoalIntelligenceEventSchema.index({
  processed: 1,
  createdAt: 1,
});