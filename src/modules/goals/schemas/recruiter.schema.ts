// src/modules/goals/schemas/recruiter.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { RecruiterStatus } from '../enums/goals.enum';

export type RecruiterDocument = HydratedDocument<Recruiter>;

@Schema({ timestamps: true })
export class Recruiter {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Goal', required: true, index: true })
  goalId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  company: string;

  @Prop({ required: true, trim: true })
  recruiterName: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  recruiterEmail: string;

  @Prop({ trim: true })
  linkedinUrl?: string;

  @Prop({
    type: String,
    enum: RecruiterStatus,
    default: RecruiterStatus.NOT_CONTACTED,
    index: true,
  })
  status: RecruiterStatus;

  @Prop()
  lastEmailSentAt?: Date;

  @Prop()
  lastReplyAt?: Date;

  @Prop()
  followUpDueAt?: Date;

  @Prop({ index: true })
  gmailThreadId?: string;

  @Prop({ type: [String], default: [] })
  gmailMessageIds: string[];

  @Prop({ trim: true })
  notes?: string;
}

export const RecruiterSchema = SchemaFactory.createForClass(Recruiter);

RecruiterSchema.index(
  {
    goalId: 1,
    recruiterEmail: 1,
  },
  {
    unique: true,
  },
);

RecruiterSchema.index({
  goalId: 1,
  status: 1,
});

RecruiterSchema.index({
  userId: 1,
  goalId: 1,
});