import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import {
  GoalActionFrequency,
  GoalActionPriority,
  GoalCategory,
  GoalTemplateKey,
  GoalType,
} from '../enums/goals.enum';

export type GoalTemplateDocument = HydratedDocument<GoalTemplate>;

export type GoalSetupQuestion = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  required: boolean;
  options?: string[];
};

export type GoalTemplateAction = {
  key: string;
  title: string;
  description?: string;
  frequency: GoalActionFrequency;
  priority: GoalActionPriority;
  successCriteria?: string;
  actionType?: string;
  metadata?: Record<string, any>;
};

export type GoalTemplateMilestone = {
  key: string;
  title: string;
  description?: string;
  weight: number;
};

@Schema({ timestamps: true })
export class GoalTemplate {
  @Prop({
    type: String,
    enum: GoalTemplateKey,
    required: true,
    unique: true,
    index: true,
  })
  key: GoalTemplateKey;

  @Prop({
    type: String,
    enum: GoalCategory,
    required: true,
    index: true,
  })
  category: GoalCategory;

  @Prop({
    type: String,
    enum: GoalType,
    required: true,
    index: true,
  })
  goalType: GoalType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Number, default: 1 })
  version: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: [Object], default: [] })
  setupQuestions: GoalSetupQuestion[];

  @Prop({ type: Object, default: {} })
  defaultMetrics: Record<string, number>;

  @Prop({ type: [Object], default: [] })
  actionTemplates: GoalTemplateAction[];

  @Prop({ type: [Object], default: [] })
  milestoneTemplates: GoalTemplateMilestone[];
}

export const GoalTemplateSchema = SchemaFactory.createForClass(GoalTemplate);

GoalTemplateSchema.index({
  category: 1,
  isActive: 1,
});

GoalTemplateSchema.index({
  key: 1,
  version: -1,
});
