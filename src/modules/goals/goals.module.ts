// src/modules/goals/goals.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { GoalsController } from './goals.controller';

import { GoalsService } from './services/goals.service';
import { GoalsGmailService } from './services/goals-gmail.service';

import { Goal, GoalSchema } from './schemas/goal.schema';
import { Recruiter, RecruiterSchema } from './schemas/recruiter.schema';
import { GoalPlan, GoalPlanSchema } from './schemas/goal-plan.schema';
import { GoalActivity, GoalActivitySchema } from './schemas/goal-activity.schema';

import { AiModule } from '../../common/ai/ai.module';

@Module({
  imports: [
    AiModule,

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
    ]),
  ],
  controllers: [GoalsController],
  providers: [
    GoalsService,
    GoalsGmailService,
  ],
  exports: [
    GoalsService,
    GoalsGmailService,
  ],
})
export class GoalsModule {}