// src/modules/goals/schemas/recruiter.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { RecruiterStatus } from '../enums/goals.enum';

export type RecruiterDocument = HydratedDocument<Recruiter>;

@Schema({
  timestamps: true,
})
export class Recruiter {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Goal',
    required: true,
    index: true,
  })
  goalId: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  company: string;

  @Prop({
    trim: true,
  })
  position?: string;

  @Prop({
    required: true,
    trim: true,
  })
  recruiterName: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  recruiterEmail: string;

  @Prop({
    trim: true,
  })
  linkedinUrl?: string;

  @Prop({
    type: String,
    enum: RecruiterStatus,
    default: RecruiterStatus.NOT_CONTACTED,
    index: true,
  })
  status: RecruiterStatus;

  @Prop()
  firstEmailSentAt?: Date;

  @Prop()
  lastEmailSentAt?: Date;

  @Prop()
  lastReplyAt?: Date;

  @Prop()
  followUpDueAt?: Date;

  @Prop({
    trim: true,
    index: true,
  })
  gmailThreadId?: string;

  @Prop({
    type: [String],
    default: [],
  })
  gmailMessageIds: string[];

  @Prop({
    trim: true,
  })
  notes?: string;
}

export const RecruiterSchema =
  SchemaFactory.createForClass(Recruiter);

/**
 * Prevent duplicate recruiter records for the same goal.
 */
RecruiterSchema.index(
  {
    goalId: 1,
    recruiterEmail: 1,
  },
  {
    unique: true,
  },
);

/**
 * Used when filtering recruiters by status.
 */
RecruiterSchema.index({
  goalId: 1,
  status: 1,
});

/**
 * Used when fetching recruiters belonging to a user's goal.
 */
RecruiterSchema.index({
  userId: 1,
  goalId: 1,
});

/**
 * Used when connecting replies and follow-ups through Gmail threads.
 */
RecruiterSchema.index({
  userId: 1,
  gmailThreadId: 1,
});