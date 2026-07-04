import { BadRequestException, Injectable } from '@nestjs/common';

import {
  GoalActionFrequency,
  GoalActionPriority,
} from '../enums/goals.enum';

@Injectable()
export class GoalPlanValidatorService {
  validatePlan(plan: any) {
    if (!plan) {
      throw new BadRequestException('Goal plan is required');
    }

    if (!Array.isArray(plan.actions) || plan.actions.length === 0) {
      throw new BadRequestException('Goal plan must have at least one action');
    }

    if (!Array.isArray(plan.milestones) || plan.milestones.length === 0) {
      throw new BadRequestException('Goal plan must have at least one milestone');
    }

    this.validateActions(plan.actions);
    this.validateMilestones(plan.milestones);

    return true;
  }

  private validateActions(actions: any[]) {
    for (const action of actions) {
      if (!action.key || !action.title) {
        throw new BadRequestException('Each action must have key and title');
      }

      if (!Object.values(GoalActionFrequency).includes(action.frequency)) {
        throw new BadRequestException(`Invalid action frequency: ${action.key}`);
      }

      if (!Object.values(GoalActionPriority).includes(action.priority)) {
        throw new BadRequestException(`Invalid action priority: ${action.key}`);
      }
    }
  }

  private validateMilestones(milestones: any[]) {
    const totalWeight = milestones.reduce(
      (sum, milestone) => sum + Number(milestone.weight || 0),
      0,
    );

    if (totalWeight !== 100) {
      throw new BadRequestException('Milestone weights must total 100');
    }

    for (const milestone of milestones) {
      if (!milestone.key || !milestone.title) {
        throw new BadRequestException('Each milestone must have key and title');
      }

      if (milestone.weight < 0 || milestone.weight > 100) {
        throw new BadRequestException(`Invalid milestone weight: ${milestone.key}`);
      }
    }
  }
}