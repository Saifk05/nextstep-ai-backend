// src/modules/goals/goals.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { GoalsController } from './goals.controller';

import { GoalsService } from './services/goals.service';
import { GoalsGmailService } from './services/goals-gmail.service';
import { GoalTemplateService } from './services/goal-template.service';
import { GoalPlanValidatorService } from './services/goal-plan-validator.service';
import { GoalTaskSchedulerService } from './services/goal-task-scheduler.service';
import { GoalIntelligenceService } from './services/goal-intelligence.service';
import { GoalIntelligenceCronService } from './services/goal-intelligence-cron.service';
import { GoalGmailIntelligenceService } from './services/goal-gmail-intelligence.service';
import { GoalFollowUpService } from './services/goal-follow-up.service';
import { Goal, GoalSchema } from './schemas/goal.schema';
import { Recruiter, RecruiterSchema } from './schemas/recruiter.schema';

import { GoalPlan, GoalPlanSchema } from './schemas/goal-plan.schema';

import {
  GoalActivity,
  GoalActivitySchema,
} from './schemas/goal-activity.schema';

import {
  GoalTemplate,
  GoalTemplateSchema,
} from './schemas/goal-template.schema';

import {
  GoalApplication,
  GoalApplicationSchema,
} from './schemas/goal-application.schema';

import {
  GoalIntelligenceEvent,
  GoalIntelligenceEventSchema,
} from './schemas/goal-intelligence-event.schema';

import { User, UserSchema } from '../user/user.model';

import { IntegrationsModule } from '../integrations/integrations.module';
import { TaskModule } from '../task/task.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { AiModule } from '../../common/ai/ai.module';
import { MailModule } from '../../common/mail/mail.module';

@Module({
  imports: [
    AiModule,
    MailModule,

    forwardRef(() => TaskModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => IntegrationsModule),

    MongooseModule.forFeature([
      {
        name: Goal.name,
        schema: GoalSchema,
      },
      {
        name: Recruiter.name,
        schema: RecruiterSchema,
      },
      {
        name: GoalPlan.name,
        schema: GoalPlanSchema,
      },
      {
        name: GoalActivity.name,
        schema: GoalActivitySchema,
      },
      {
        name: GoalTemplate.name,
        schema: GoalTemplateSchema,
      },
      {
        name: GoalApplication.name,
        schema: GoalApplicationSchema,
      },
      {
        name: GoalIntelligenceEvent.name,
        schema: GoalIntelligenceEventSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],

  controllers: [GoalsController],

  providers: [
    GoalsService,
    GoalsGmailService,
    GoalTemplateService,
    GoalPlanValidatorService,
    GoalTaskSchedulerService,
    GoalIntelligenceService,
    GoalIntelligenceCronService,
    GoalGmailIntelligenceService,
    GoalFollowUpService,
  ],

  exports: [
    GoalsService,
    GoalsGmailService,
    GoalTemplateService,
    GoalPlanValidatorService,
    GoalTaskSchedulerService,
    GoalIntelligenceService,
    GoalIntelligenceCronService,
    GoalGmailIntelligenceService,
    GoalFollowUpService,
  ],
})
export class GoalsModule {}
