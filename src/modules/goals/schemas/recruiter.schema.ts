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

  /*
   * Date of the first cold email sent
   * to this recruiter.
   */
  @Prop()
  firstEmailSentAt?: Date;

  /*
   * Date of the most recent email sent
   * to this recruiter.
   */
  @Prop()
  lastEmailSentAt?: Date;

  /*
   * Date of the latest incoming reply.
   */
  @Prop()
  lastReplyAt?: Date;

  /*
   * Date when the next follow-up is due.
   */
  @Prop({
    index: true,
  })
  followUpDueAt?: Date;

  /*
   * Number of follow-up emails already sent.
   *
   * 0 = no follow-up sent
   * 1 = first follow-up sent
   * 2 = second follow-up sent
   * 3 = final follow-up sent
   */
  @Prop({
    default: 0,
    min: 0,
  })
  followUpCount: number;

  /*
   * Date when the latest follow-up email
   * was sent by the user.
   */
  @Prop()
  lastFollowUpAt?: Date;

  /*
   * Used to prevent duplicate reminders
   * from the hourly cron.
   */
  @Prop()
  lastReminderSentAt?: Date;

  /*
   * Date when the outreach was marked
   * as NO_RESPONSE.
   */
  @Prop()
  noResponseAt?: Date;

  /*
   * Date when follow-up tracking was closed
   * because of rejection, offer or no response.
   */
  @Prop()
  closedAt?: Date;

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

export const RecruiterSchema = SchemaFactory.createForClass(Recruiter);

/*
 * Prevent duplicate recruiter records
 * inside the same goal.
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

/*
 * Used when filtering recruiters
 * by goal and status.
 */
RecruiterSchema.index({
  goalId: 1,
  status: 1,
});

/*
 * Used when fetching recruiters
 * belonging to a user's goal.
 */
RecruiterSchema.index({
  userId: 1,
  goalId: 1,
});

/*
 * Used when connecting Gmail replies
 * and follow-up emails through threads.
 */
RecruiterSchema.index({
  userId: 1,
  gmailThreadId: 1,
});

/*
 * Used by GoalFollowUpService cron
 * to find upcoming and overdue follow-ups.
 */
RecruiterSchema.index({
  status: 1,
  followUpDueAt: 1,
});

/*
 * Used by the follow-up cron when processing
 * reminders for a specific user's goal.
 */
RecruiterSchema.index({
  userId: 1,
  goalId: 1,
  status: 1,
  followUpDueAt: 1,
});
