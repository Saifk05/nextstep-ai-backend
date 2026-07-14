// src/modules/goals/services/goal-follow-up.service.ts

import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import {
  Model,
  Types,
} from 'mongoose';

import {
  Recruiter,
  RecruiterDocument,
} from '../schemas/recruiter.schema';

import {
  Goal,
  GoalDocument,
} from '../schemas/goal.schema';

import {
  User,
  UserDocument,
} from '../../user/user.model';

import {
  RecruiterStatus,
} from '../enums/goals.enum';

import {
  NotificationsService,
} from '../../notifications/notifications.service';

import {
  GoalReminderEmailType,
  MailService,
} from '../../../common/mail/mail.service';

interface RecruiterLookupParams {
  userId: string;
  goalId: string;
  recruiterEmail?: string;
  threadId?: string;
}

interface ScheduleInitialFollowUpParams
  extends RecruiterLookupParams {
  sentAt?: Date;
}

interface MarkFollowUpSentParams
  extends RecruiterLookupParams {
  sentAt?: Date;
}

@Injectable()
export class GoalFollowUpService {
  private readonly logger = new Logger(
    GoalFollowUpService.name,
  );

  /*
   * Follow-up days are calculated from the date
   * on which the first cold email was sent.
   *
   * First follow-up: day 7
   * Second follow-up: day 15
   * Final follow-up: day 20
   */
  private readonly followUpDayOffsets = [
    7,
    15,
    20,
  ];

  private readonly noResponseAfterDays = 30;

  constructor(
    @InjectModel(Recruiter.name)
    private readonly recruiterModel:
      Model<RecruiterDocument>,

    @InjectModel(Goal.name)
    private readonly goalModel:
      Model<GoalDocument>,

    @InjectModel(User.name)
    private readonly userModel:
      Model<UserDocument>,

    private readonly notificationsService:
      NotificationsService,

    private readonly mailService:
      MailService,
  ) {}

  /*
   * Runs once every hour.
   *
   * Asia/Kolkata is used so reminders follow
   * the user's expected India dates.
   */
  @Cron('0 0 * * * *', {
    timeZone: 'Asia/Kolkata',
  })
  async processFollowUps() {
    const now = new Date();

    this.logger.log(
      'Starting recruiter follow-up processing',
    );

    /*
     * Process no responses before due reminders.
     * This prevents a recruiter from receiving a
     * follow-up reminder after the 30-day period.
     */
    const noResponses =
      await this.processNoResponses(now);

    const tomorrowReminders =
      await this.sendTomorrowReminders(now);

    const dueReminders =
      await this.processDueFollowUps(now);

    const result = {
      noResponses,
      tomorrowReminders,
      dueReminders,
    };

    this.logger.log(
      `Follow-up processing completed: ${JSON.stringify(
        result,
      )}`,
    );

    return result;
  }

  /**
   * Call this when a new cold email is detected.
   */
  async scheduleInitialFollowUp(
    params: ScheduleInitialFollowUpParams,
  ) {
    const recruiter =
      await this.findRecruiter(params);

    if (!recruiter) {
      this.logger.warn(
        `Cannot schedule follow-up. Recruiter not found for goal ${params.goalId}`,
      );

      return null;
    }

    const sentAt =
      params.sentAt ||
      (recruiter as any).firstEmailSentAt ||
      recruiter.lastEmailSentAt ||
      new Date();

    const followUpDueAt = this.addDays(
      sentAt,
      this.followUpDayOffsets[0],
    );

    return this.recruiterModel.findByIdAndUpdate(
      recruiter._id,
      {
        $set: {
          status: RecruiterStatus.EMAIL_SENT,

          firstEmailSentAt:
            (recruiter as any).firstEmailSentAt ||
            sentAt,

          lastEmailSentAt: sentAt,
          followUpDueAt,
          followUpCount:
            Number(
              (recruiter as any).followUpCount,
            ) || 0,
        },

        $unset: {
          lastReminderSentAt: 1,
          noResponseAt: 1,
          closedAt: 1,
        },
      },
      {
        new: true,
      },
    );
  }

  /**
   * Call this when Gmail detects that the user
   * sent a follow-up email to the recruiter.
   */
  async markFollowUpSent(
    params: MarkFollowUpSentParams,
  ) {
    const recruiter =
      await this.findRecruiter(params);

    if (!recruiter) {
      this.logger.warn(
        `Cannot update follow-up. Recruiter not found for goal ${params.goalId}`,
      );

      return null;
    }

    if (
      this.isClosedStatus(
        recruiter.status as RecruiterStatus,
      )
    ) {
      return recruiter;
    }

    const sentAt =
      params.sentAt || new Date();

    const firstEmailSentAt =
      (recruiter as any).firstEmailSentAt ||
      recruiter.lastEmailSentAt ||
      sentAt;

    const currentFollowUpCount =
      Number(
        (recruiter as any).followUpCount,
      ) || 0;

    const newFollowUpCount =
      currentFollowUpCount + 1;

    /*
     * newFollowUpCount = 1 means the first
     * follow-up has now been sent.
     *
     * The next due date will therefore use
     * followUpDayOffsets[1], which is day 15.
     */
    const nextOffset =
      this.followUpDayOffsets[
        newFollowUpCount
      ];

    const update: any = {
      $set: {
        status: RecruiterStatus.EMAIL_SENT,

        firstEmailSentAt,
        lastEmailSentAt: sentAt,
        lastFollowUpAt: sentAt,
        followUpCount: newFollowUpCount,
      },

      $unset: {
        lastReminderSentAt: 1,
      },
    };

    if (nextOffset !== undefined) {
      update.$set.followUpDueAt =
        this.addDays(
          firstEmailSentAt,
          nextOffset,
        );
    } else {
      update.$unset.followUpDueAt = 1;
    }

    const updatedRecruiter =
      await this.recruiterModel.findByIdAndUpdate(
        recruiter._id,
        update,
        {
          new: true,
        },
      );

    this.logger.log(
      `Follow-up ${newFollowUpCount} recorded for recruiter ${recruiter._id.toString()}`,
    );

    return updatedRecruiter;
  }

  /**
   * Call this when an incoming recruiter reply
   * is detected.
   */
  async stopForReply(
    params: RecruiterLookupParams,
  ) {
    const recruiter =
      await this.findRecruiter(params);

    if (!recruiter) {
      return null;
    }

    return this.recruiterModel.findByIdAndUpdate(
      recruiter._id,
      {
        $set: {
          status: RecruiterStatus.REPLIED,
          lastReplyAt: new Date(),
        },

        $unset: {
          followUpDueAt: 1,
          lastReminderSentAt: 1,
        },
      },
      {
        new: true,
      },
    );
  }

  /**
   * Call this when Gmail detects a real
   * rejection email.
   */
  async stopForRejection(
    params: RecruiterLookupParams,
  ) {
    const recruiter =
      await this.findRecruiter(params);

    if (!recruiter) {
      return null;
    }

    if (
      recruiter.status ===
      RecruiterStatus.REJECTED
    ) {
      return recruiter;
    }

    const updatedRecruiter =
      await this.recruiterModel.findByIdAndUpdate(
        recruiter._id,
        {
          $set: {
            status:
              RecruiterStatus.REJECTED,

            closedAt: new Date(),
          },

          $unset: {
            followUpDueAt: 1,
            lastReminderSentAt: 1,
          },
        },
        {
          new: true,
        },
      );

    if (updatedRecruiter) {
      await this.notifyUser({
        recruiter:
          updatedRecruiter as RecruiterDocument,

        type: 'APPLICATION_REJECTED',
      });
    }

    return updatedRecruiter;
  }

  /**
   * Call this when an interview email is detected.
   */
  async stopForInterview(
    params: RecruiterLookupParams,
  ) {
    const recruiter =
      await this.findRecruiter(params);

    if (!recruiter) {
      return null;
    }

    return this.recruiterModel.findByIdAndUpdate(
      recruiter._id,
      {
        $set: {
          status:
            RecruiterStatus.INTERVIEW,
        },

        $unset: {
          followUpDueAt: 1,
          lastReminderSentAt: 1,
        },
      },
      {
        new: true,
      },
    );
  }

  /**
   * Call this when an offer email is detected.
   */
  async stopForOffer(
    params: RecruiterLookupParams,
  ) {
    const recruiter =
      await this.findRecruiter(params);

    if (!recruiter) {
      return null;
    }

    return this.recruiterModel.findByIdAndUpdate(
      recruiter._id,
      {
        $set: {
          status: RecruiterStatus.OFFER,
          closedAt: new Date(),
        },

        $unset: {
          followUpDueAt: 1,
          lastReminderSentAt: 1,
        },
      },
      {
        new: true,
      },
    );
  }

  private async sendTomorrowReminders(
    now: Date,
  ): Promise<number> {
    const {
      tomorrowStart,
      tomorrowEnd,
    } = this.getIndiaDateRanges(now);

    const recruiters =
      await this.recruiterModel.find({
        status:
          RecruiterStatus.EMAIL_SENT,

        followUpDueAt: {
          $gte: tomorrowStart,
          $lt: tomorrowEnd,
        },
      });

    let sentCount = 0;

    for (const recruiter of recruiters) {
      try {
        const lastReminderSentAt =
          (recruiter as any)
            .lastReminderSentAt;

        /*
         * Prevent the hourly cron from sending
         * the same reminder repeatedly today.
         */
        if (
          lastReminderSentAt &&
          this.isSameIndiaDate(
            new Date(lastReminderSentAt),
            now,
          )
        ) {
          continue;
        }

        await this.notifyUser({
          recruiter,
          type: 'FOLLOW_UP_TOMORROW',
        });

        await this.recruiterModel.updateOne(
          {
            _id: recruiter._id,
          },
          {
            $set: {
              lastReminderSentAt: now,
            },
          },
        );

        sentCount++;
      } catch (error) {
        this.logger.error(
          `Unable to send tomorrow reminder for recruiter ${recruiter._id.toString()}`,
          error instanceof Error
            ? error.stack
            : String(error),
        );
      }
    }

    return sentCount;
  }

  private async processDueFollowUps(
    now: Date,
  ): Promise<number> {
    /*
     * $lte is used instead of checking only today's
     * date. If the server was offline on the due date,
     * the reminder will still be processed later.
     */
    const recruiters =
      await this.recruiterModel.find({
        status:
          RecruiterStatus.EMAIL_SENT,

        followUpDueAt: {
          $lte: now,
        },
      });

    let processedCount = 0;

    for (const recruiter of recruiters) {
      try {
        /*
         * Atomic update prevents duplicate processing
         * when multiple backend instances run the cron.
         */
        const updatedRecruiter =
          await this.recruiterModel.findOneAndUpdate(
            {
              _id: recruiter._id,

              status:
                RecruiterStatus.EMAIL_SENT,
            },
            {
              $set: {
                status:
                  RecruiterStatus.FOLLOW_UP_DUE,

                lastReminderSentAt: now,
              },
            },
            {
              new: true,
            },
          );

        if (!updatedRecruiter) {
          continue;
        }

        await this.notifyUser({
          recruiter:
            updatedRecruiter as RecruiterDocument,

          type: 'FOLLOW_UP_DUE',
        });

        processedCount++;
      } catch (error) {
        this.logger.error(
          `Unable to process due follow-up for recruiter ${recruiter._id.toString()}`,
          error instanceof Error
            ? error.stack
            : String(error),
        );
      }
    }

    return processedCount;
  }

  private async processNoResponses(
    now: Date,
  ): Promise<number> {
    const noResponseThreshold =
      this.addDays(
        now,
        -this.noResponseAfterDays,
      );

    const recruiters =
      await this.recruiterModel.find({
        status: {
          $in: [
            RecruiterStatus.EMAIL_SENT,
            RecruiterStatus.FOLLOW_UP_DUE,
          ],
        },

        $or: [
          {
            firstEmailSentAt: {
              $lte: noResponseThreshold,
            },
          },
          {
            firstEmailSentAt: {
              $exists: false,
            },

            lastEmailSentAt: {
              $lte: noResponseThreshold,
            },
          },
        ],
      });

    let processedCount = 0;

    for (const recruiter of recruiters) {
      try {
        const updatedRecruiter =
          await this.recruiterModel.findOneAndUpdate(
            {
              _id: recruiter._id,

              status: {
                $in: [
                  RecruiterStatus.EMAIL_SENT,
                  RecruiterStatus.FOLLOW_UP_DUE,
                ],
              },
            },
            {
              $set: {
                status:
                  RecruiterStatus.NO_RESPONSE,

                noResponseAt: now,
                closedAt: now,
              },

              $unset: {
                followUpDueAt: 1,
                lastReminderSentAt: 1,
              },
            },
            {
              new: true,
            },
          );

        if (!updatedRecruiter) {
          continue;
        }

        await this.notifyUser({
          recruiter:
            updatedRecruiter as RecruiterDocument,

          type: 'NO_RESPONSE',
        });

        processedCount++;
      } catch (error) {
        this.logger.error(
          `Unable to process no response for recruiter ${recruiter._id.toString()}`,
          error instanceof Error
            ? error.stack
            : String(error),
        );
      }
    }

    return processedCount;
  }

  private async notifyUser(params: {
    recruiter: RecruiterDocument;
    type: GoalReminderEmailType;
  }) {
    const recruiter = params.recruiter;

    const userId =
      recruiter.userId.toString();

    const goalId =
      recruiter.goalId.toString();

    const [user, goal] =
      await Promise.all([
        this.userModel
          .findById(recruiter.userId)
          .lean(),

        this.goalModel
          .findById(recruiter.goalId)
          .lean(),
      ]);

    const userData = user as any;
    const goalData = goal as any;

    const userEmail =
      userData?.email ||
      userData?.emailAddress ||
      null;

    const firstName =
      userData?.firstName ||
      userData?.name?.split(' ')?.[0] ||
      undefined;

    const targetRole =
      goalData?.setupAnswers?.targetRole ||
      goalData?.title ||
      'your job opportunity';

    const recruiterName =
      recruiter.recruiterName ||
      undefined;

    const company =
      recruiter.company ||
      undefined;

    const recruiterOrCompany =
      recruiterName ||
      company ||
      recruiter.recruiterEmail ||
      'the recruiter';

    const followUpNumber =
      (Number(
        (recruiter as any).followUpCount,
      ) || 0) + 1;

    const notificationContent =
      this.getNotificationContent({
        type: params.type,
        recruiterOrCompany,
        targetRole,
        followUpNumber,
      });

    try {
      await this.notificationsService
        .createNotification({
          userId:
            new Types.ObjectId(userId),

          title:
            notificationContent.title,

          message:
            notificationContent.message,

          source: 'GOAL',
          priority:
            params.type ===
            'APPLICATION_REJECTED'
              ? 'HIGH'
              : 'MEDIUM',

          isRead: false,

          metadata: {
            goalId,
            recruiterId:
              recruiter._id.toString(),

            recruiterEmail:
              recruiter.recruiterEmail,

            company:
              recruiter.company,

            type: params.type,

            followUpNumber,
          },
        } as any);
    } catch (error) {
      this.logger.error(
        `Unable to create notification for user ${userId}`,
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }

    if (!userEmail) {
      this.logger.warn(
        `Reminder email skipped because user ${userId} has no email address`,
      );

      return;
    }

    await this.mailService
      .sendGoalReminderEmail({
        to: userEmail,
        type: params.type,
        firstName,
        recruiterName,
        company,
        targetRole,

        dueDate:
          (recruiter as any)
            .followUpDueAt,
      });
  }

  private getNotificationContent(params: {
    type: GoalReminderEmailType;
    recruiterOrCompany: string;
    targetRole: string;
    followUpNumber: number;
  }): {
    title: string;
    message: string;
  } {
    const {
      type,
      recruiterOrCompany,
      targetRole,
      followUpNumber,
    } = params;

    switch (type) {
      case 'FOLLOW_UP_TOMORROW':
        return {
          title:
            'Follow-up due tomorrow',

          message:
            `Follow-up ${followUpNumber} with ` +
            `${recruiterOrCompany} for ` +
            `${targetRole} is due tomorrow.`,
        };

      case 'FOLLOW_UP_DUE':
        return {
          title:
            'Follow-up due today',

          message:
            `You have not received a reply from ` +
            `${recruiterOrCompany}. ` +
            `Send follow-up ${followUpNumber} today.`,
        };

      case 'NO_RESPONSE':
        return {
          title:
            'No response after 30 days',

          message:
            `No reply was detected from ` +
            `${recruiterOrCompany} for ` +
            `${targetRole}. The outreach has been ` +
            `marked as no response.`,
        };

      case 'APPLICATION_REJECTED':
        return {
          title:
            'Application rejected',

          message:
            `A rejection email from ` +
            `${recruiterOrCompany} was detected ` +
            `for ${targetRole}. Follow-up reminders ` +
            `have been stopped.`,
        };
    }
  }

  private async findRecruiter(
    params: RecruiterLookupParams,
  ): Promise<RecruiterDocument | null> {
    if (
      !Types.ObjectId.isValid(
        params.userId,
      ) ||
      !Types.ObjectId.isValid(
        params.goalId,
      )
    ) {
      return null;
    }

    const lookupConditions: any[] = [];

    if (params.recruiterEmail?.trim()) {
      lookupConditions.push({
        recruiterEmail:
          params.recruiterEmail
            .trim()
            .toLowerCase(),
      });
    }

    if (params.threadId?.trim()) {
      lookupConditions.push({
        gmailThreadId:
          params.threadId.trim(),
      });
    }

    if (!lookupConditions.length) {
      return null;
    }

    return this.recruiterModel.findOne({
      userId:
        new Types.ObjectId(
          params.userId,
        ),

      goalId:
        new Types.ObjectId(
          params.goalId,
        ),

      $or: lookupConditions,
    });
  }

  private isClosedStatus(
    status: RecruiterStatus,
  ): boolean {
    return [
      RecruiterStatus.REPLIED,
      RecruiterStatus.INTERVIEW,
      RecruiterStatus.REJECTED,
      RecruiterStatus.OFFER,
      RecruiterStatus.NO_RESPONSE,
    ].includes(status);
  }

  private addDays(
    date: Date,
    days: number,
  ): Date {
    return new Date(
      date.getTime() +
        days *
          24 *
          60 *
          60 *
          1000,
    );
  }

  private getIndiaDateRanges(
    date: Date,
  ) {
    const indiaDate =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        },
      ).format(date);

    const todayStart =
      new Date(
        `${indiaDate}T00:00:00+05:30`,
      );

    const todayEnd =
      this.addDays(todayStart, 1);

    const tomorrowStart =
      todayEnd;

    const tomorrowEnd =
      this.addDays(
        tomorrowStart,
        1,
      );

    return {
      todayStart,
      todayEnd,
      tomorrowStart,
      tomorrowEnd,
    };
  }

  private isSameIndiaDate(
    firstDate: Date,
    secondDate: Date,
  ): boolean {
    const formatter =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        },
      );

    return (
      formatter.format(firstDate) ===
      formatter.format(secondDate)
    );
  }
}