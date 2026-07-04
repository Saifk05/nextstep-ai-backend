// src/modules/goals/goals.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { GoalsController } from './goals.controller';

import { GoalsService } from './services/goals.service';
import { GoalsGmailService } from './services/goals-gmail.service';
import { GoalTemplateService } from './services/goal-template.service';
import { GoalPlanValidatorService } from './services/goal-plan-validator.service';

import { Goal, GoalSchema } from './schemas/goal.schema';
import { Recruiter, RecruiterSchema } from './schemas/recruiter.schema';
import { GoalPlan, GoalPlanSchema } from './schemas/goal-plan.schema';
import { GoalActivity, GoalActivitySchema } from './schemas/goal-activity.schema';
import {
  GoalTemplate,
  GoalTemplateSchema,
} from './schemas/goal-template.schema';

import { AiModule } from '../../common/ai/ai.module';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [
    AiModule,

    forwardRef(() => TaskModule),

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
    ]),
  ],
  controllers: [GoalsController],
  providers: [
    GoalsService,
    GoalsGmailService,
    GoalTemplateService,
    GoalPlanValidatorService,
  ],
  exports: [
    GoalsService,
    GoalsGmailService,
    GoalTemplateService,
    GoalPlanValidatorService,
  ],
})
export class GoalsModule {}