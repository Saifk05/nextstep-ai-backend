// src/modules/goals/services/goals-gmail.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Goal, GoalDocument } from '../schemas/goal.schema';
import { GoalTemplateKey } from '../enums/goals.enum';


@Injectable()
export class GoalsGmailService {
  constructor(
    @InjectModel(Goal.name)
    private readonly goalModel: Model<GoalDocument>,
  ) {}

  async syncGoalGmail(userId: string, goalId: string) {
    const goal = await this.goalModel.findOne({
      _id: goalId,
      userId,
    });

    if (!goal) {
      throw new BadRequestException('Goal not found');
    }

    if (goal.templateKey !== GoalTemplateKey.JOB_SEARCH) {
      throw new BadRequestException(
        'Gmail automation is only available for job search goals',
      );
    }

    return {
      message: 'Gmail automation connected. Actual Gmail scan will be implemented next.',
      goalId,
      goalType: goal.goalType,
    };
  }
}