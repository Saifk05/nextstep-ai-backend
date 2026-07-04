// src/modules/goals/services/goals.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TaskService } from '../../task/task.service';


import { Goal, GoalDocument } from '../schemas/goal.schema';
import { GoalPlan, GoalPlanDocument } from '../schemas/goal-plan.schema';
import {
  GoalActivity,
  GoalActivityDocument,
} from '../schemas/goal-activity.schema';

import {
  CreateGoalDto,
  UpdateGoalDto,
  UpdateGoalStatusDto,
} from '../dto/goals.dto';

import {
  ActivityType,
  GoalPlanSource,
  GoalStatus,
} from '../enums/goals.enum';

import { GoalTemplateService } from './goal-template.service';
import { GoalPlanValidatorService } from './goal-plan-validator.service';

@Injectable()
export class GoalsService {
  constructor(
    @InjectModel(Goal.name)
    private readonly goalModel: Model<GoalDocument>,

    @InjectModel(GoalPlan.name)
    private readonly goalPlanModel: Model<GoalPlanDocument>,

    @InjectModel(GoalActivity.name)
    private readonly activityModel: Model<GoalActivityDocument>,

    private readonly goalTemplateService: GoalTemplateService,

    private readonly goalPlanValidatorService: GoalPlanValidatorService,

    @Inject(forwardRef(() => TaskService))
    private readonly taskService: TaskService,

    // private readonly taskService: TaskService,
  ) {}

  async createGoal(userId: string, dto: CreateGoalDto) {
    const normalizedTitle = dto.title.trim();
    const targetDate = new Date(dto.targetDate);

    if (targetDate < new Date()) {
      throw new BadRequestException('Target date must be in the future');
    }

    const existingGoal = await this.goalModel.findOne({
      userId: new Types.ObjectId(userId),
      title: {
        $regex: `^${normalizedTitle}$`,
        $options: 'i',
      },
    });

    if (existingGoal) {
      throw new BadRequestException('A goal with this title already exists');
    }

    const { template, plan } = this.buildTemplatePlan(dto);

    const goal = await this.goalModel.create({
      userId: new Types.ObjectId(userId),
      title: normalizedTitle,
      description: dto.description?.trim() || template.description,
      category: template.category,
      templateKey: template.key,
      templateVersion: template.version,
      setupAnswers: dto.setupAnswers || {},
      planSource: GoalPlanSource.TEMPLATE,
      goalType: template.goalType,
      targetDate,
      status: GoalStatus.ACTIVE,
      progressPercentage: 0,
      aiPlanSummary: plan.strategySummary,
      metrics: plan.metrics,
    });

    const savedPlan = await this.goalPlanModel.create({
      userId: goal.userId,
      goalId: goal._id,
      version: 1,
      actions: plan.actions,
      milestones: plan.milestones,
      dailyActions: plan.actions.filter((a) => a.frequency === 'DAILY'),
      weeklyActions: plan.actions.filter((a) => a.frequency === 'WEEKLY'),
      legacyMilestones: plan.milestones,
      strategySummary: plan.strategySummary,
      isActive: true,
    });

    await this.createActivity({
      userId,
      goalId: goal._id.toString(),
      type: ActivityType.TEMPLATE_SELECTED,
      message: `Template selected: ${template.title}`,
      metadata: {
        templateKey: template.key,
        category: template.category,
        templateVersion: template.version,
      },
    });

    await this.createActivity({
      userId,
      goalId: goal._id.toString(),
      type: ActivityType.GOAL_CREATED,
      message: `Goal created: ${goal.title}`,
    });

    const createdTasks = await this.taskService.createTasksFromGoalPlan({
      userId,
      goalId: goal._id.toString(),
      goalPlanId: savedPlan._id.toString(),
      actions: savedPlan.actions || [],
    });

    await this.createActivity({
      userId,
      goalId: goal._id.toString(),
      type: ActivityType.GOAL_TASKS_CREATED,
      message: `${createdTasks.length} tasks created from goal plan`,
      metadata: {
        taskCount: createdTasks.length,
      },
    });

    return this.mapGoalResponse(goal, savedPlan);
  }

  async getActiveGoals(userId: string) {
    const goals = await this.goalModel
      .find({
        userId: new Types.ObjectId(userId),
        status: GoalStatus.ACTIVE,
      })
      .sort({ createdAt: -1 })
      .lean();

      return goals.map((goal) => ({
      id: goal._id?.toString(),
      title: goal.title,
      category: goal.category,
      templateKey: goal.templateKey,
      goalType: goal.goalType,
      status: goal.status,
      targetDate: goal.targetDate,
      progressPercentage: goal.progressPercentage || 0,
    }));
    // return goals.map((goal) => this.mapGoalResponse(goal));
  }

  async getGoalById(userId: string, goalId: string) {
    const goal = await this.goalModel
      .findOne({
        _id: new Types.ObjectId(goalId),
        userId: new Types.ObjectId(userId),
      })
      .lean();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const plan = await this.goalPlanModel
      .findOne({
        userId: new Types.ObjectId(userId),
        goalId: new Types.ObjectId(goalId),
        isActive: true,
      })
      .lean();

    const recentActivity = await this.activityModel
      .find({
        userId: new Types.ObjectId(userId),
        goalId: new Types.ObjectId(goalId),
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return this.mapGoalResponse(goal, plan, recentActivity);
  }

  async updateGoal(userId: string, goalId: string, dto: UpdateGoalDto) {
    const updateData: any = {};

    if (dto.title) {
      const normalizedTitle = dto.title.trim();

      const existingGoal = await this.goalModel.findOne({
        _id: { $ne: new Types.ObjectId(goalId) },
        userId: new Types.ObjectId(userId),
        title: {
          $regex: `^${normalizedTitle}$`,
          $options: 'i',
        },
      });

      if (existingGoal) {
        throw new BadRequestException('A goal with this title already exists');
      }

      updateData.title = normalizedTitle;
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description?.trim();
    }

    if (dto.targetDate) {
      const targetDate = new Date(dto.targetDate);

      if (targetDate < new Date()) {
        throw new BadRequestException('Target date must be in the future');
      }

      updateData.targetDate = targetDate;
    }

    const goal = await this.goalModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(goalId),
        userId: new Types.ObjectId(userId),
      },
      updateData,
      { new: true },
    );

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    await this.createActivity({
      userId,
      goalId,
      type: ActivityType.GOAL_UPDATED,
      message: `Goal updated: ${goal.title}`,
    });

    return this.mapGoalResponse(goal);
  }

  async updateGoalStatus(
    userId: string,
    goalId: string,
    dto: UpdateGoalStatusDto,
  ) {
    const goal = await this.goalModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(goalId),
        userId: new Types.ObjectId(userId),
      },
      { status: dto.status },
      { new: true },
    );

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    await this.createActivity({
      userId,
      goalId,
      type: ActivityType.GOAL_STATUS_UPDATED,
      message: `Goal status changed to ${dto.status}`,
    });

    return this.mapGoalResponse(goal);
  }

  async regenerateGoalPlan(userId: string, goalId: string) {
    const goal = await this.goalModel.findOne({
      _id: new Types.ObjectId(goalId),
      userId: new Types.ObjectId(userId),
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const plan = this.goalTemplateService.buildDefaultPlan(
      goal.templateKey,
      goal.setupAnswers || {},
    );
    // const plan = this.goalTemplateService.buildDefaultPlan(goal.templateKey);
    this.goalPlanValidatorService.validatePlan(plan);

    await this.goalPlanModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        goalId: new Types.ObjectId(goalId),
        isActive: true,
      },
      { isActive: false },
    );

    goal.aiPlanSummary = plan.strategySummary;
    await goal.save();

    const newPlan = await this.goalPlanModel.create({
      userId: goal.userId,
      goalId: goal._id,
      version: 1,
      actions: plan.actions,
      milestones: plan.milestones,
      dailyActions: plan.actions.filter((a) => a.frequency === 'DAILY'),
      weeklyActions: plan.actions.filter((a) => a.frequency === 'WEEKLY'),
      // legacyMilestones: plan.milestones,
      strategySummary: plan.strategySummary,
      isActive: true,
    });

    await this.createActivity({
      userId,
      goalId,
      type: ActivityType.AI_PLAN_REGENERATED,
      message: 'Goal plan regenerated from template',
      metadata: {
        templateKey: goal.templateKey,
      },
    });

    return this.mapGoalResponse(goal, newPlan);
  }

  async getGoalActivity(userId: string, goalId: string) {
    await this.ensureGoalBelongsToUser(userId, goalId);

    return this.activityModel
      .find({
        userId: new Types.ObjectId(userId),
        goalId: new Types.ObjectId(goalId),
      })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
  }

  async getGoalPlan(userId: string, goalId: string) {
    await this.ensureGoalBelongsToUser(userId, goalId);

    const plan = await this.goalPlanModel
      .findOne({
        userId: new Types.ObjectId(userId),
        goalId: new Types.ObjectId(goalId),
        isActive: true,
      })
      .lean();

    if (!plan) {
      return null;
    }

    return this.mapPlanResponse(plan);
  }

  async getGoalDashboardData(userId: string) {
    const activeGoals = await this.goalModel
      .find({
        userId: new Types.ObjectId(userId),
        status: GoalStatus.ACTIVE,
      })
      .sort({ createdAt: -1 })
      .select(
        '_id title category templateKey goalType status progressPercentage targetDate',
      )
      .lean();

    const completedGoalsCount = await this.goalModel.countDocuments({
      userId: new Types.ObjectId(userId),
      status: GoalStatus.COMPLETED,
    });

    return {
      activeGoals: activeGoals.map((goal) => ({
        id: goal._id?.toString(),
        title: goal.title,
        category: goal.category,
        templateKey: goal.templateKey,
        goalType: goal.goalType,
        status: goal.status,
        targetDate: goal.targetDate,
        progressPercentage: goal.progressPercentage || 0,
      })),
      completedGoalsCount,
    };
  }

  async handleGoalTaskCompleted(userId: string, task: any) {
    if (!task?.goalId) {
      return;
    }

    const goalId = task.goalId.toString();

    const metricIncrement = this.getMetricIncrementForActionType(
      task.goalActionType,
    );

    const stats = await this.taskService.getGoalTaskStats(userId, goalId);

    const updateQuery: any = {
      $set: {
        progressPercentage: stats.progressPercentage,
      },
    };

    if (Object.keys(metricIncrement).length) {
      updateQuery.$inc = metricIncrement;
    }

    await this.goalModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(goalId),
        userId: new Types.ObjectId(userId),
        status: GoalStatus.ACTIVE,
      },
      updateQuery,
      { new: true },
    );

    await this.createActivity({
      userId,
      goalId,
      type: ActivityType.GOAL_TASK_COMPLETED,
      message: `Completed task: ${task.title}`,
      metadata: {
        taskId: task._id?.toString(),
        goalActionKey: task.goalActionKey,
        goalActionType: task.goalActionType,
        progressPercentage: stats.progressPercentage,
        completedTasks: stats.completedTasks,
        totalTasks: stats.totalTasks,
      },
    });
  }

  private buildTemplatePlan(dto: CreateGoalDto) {
    const template = this.goalTemplateService.getTemplate(dto.templateKey);

    if (template.category !== dto.category) {
      throw new BadRequestException(
        'Goal category does not match selected template',
      );
    }

    this.goalTemplateService.validateSetupAnswers(
      dto.templateKey,
      dto.setupAnswers,
    );

    const plan = this.goalTemplateService.buildDefaultPlan(
      dto.templateKey,
      dto.setupAnswers || {},
    );
    // const plan = this.goalTemplateService.buildDefaultPlan(dto.templateKey);

    this.goalPlanValidatorService.validatePlan(plan);

    return {
      template,
      plan,
    };
  }

  private async ensureGoalBelongsToUser(userId: string, goalId: string) {
    const exists = await this.goalModel.exists({
      _id: new Types.ObjectId(goalId),
      userId: new Types.ObjectId(userId),
    });

    if (!exists) {
      throw new NotFoundException('Goal not found');
    }
  }

  private mapGoalResponse(goal: any, plan?: any, recentActivity: any[] = []) {
    return {
      id: goal._id?.toString(),
      title: goal.title,
      description: goal.description,
      category: goal.category,
      templateKey: goal.templateKey,
      templateVersion: goal.templateVersion,
      planSource: goal.planSource,
      goalType: goal.goalType,
      status: goal.status,
      targetDate: goal.targetDate,
      progressPercentage: goal.progressPercentage || 0,
      aiPlanSummary: goal.aiPlanSummary,
      setupAnswers: goal.setupAnswers || {},
      metrics: {
        emailsSent: goal.metrics?.emailsSent || 0,
        replies: goal.metrics?.replies || 0,
        interviews: goal.metrics?.interviews || 0,
        offers: goal.metrics?.offers || 0,
        rejections: goal.metrics?.rejections || 0,
        followUpsDue: goal.metrics?.followUpsDue || 0,
        applicationsSubmitted: goal.metrics?.applicationsSubmitted || 0,
      },
      plan: plan ? this.mapPlanResponse(plan) : null,
      recentActivity,
    };
  }

  private mapPlanResponse(plan: any) {
    return {
      id: plan._id?.toString(),
      version: plan.version || 1,
      strategySummary: plan.strategySummary,
      actions: plan.actions || [],
      milestones: plan.milestones || [],
      dailyActions: plan.dailyActions || [],
      weeklyActions: plan.weeklyActions || [],
    };
  }

  private getMetricIncrementForActionType(actionType?: string) {
      switch (actionType) {
        case 'APPLICATION':
          return { 'metrics.applicationsSubmitted': 1 };

        case 'OUTREACH':
          return { 'metrics.emailsSent': 1 };

        case 'FOLLOW_UP':
          return { 'metrics.emailsSent': 1 };

        default:
          return {};
      }
    }


  private async createActivity(data: {
    userId: string;
    goalId: string;
    recruiterId?: string;
    type: ActivityType;
    message: string;
    metadata?: Record<string, any>;
  }) {
    return this.activityModel.create({
      userId: new Types.ObjectId(data.userId),
      goalId: new Types.ObjectId(data.goalId),
      recruiterId: data.recruiterId
        ? new Types.ObjectId(data.recruiterId)
        : undefined,
      type: data.type,
      message: data.message,
      metadata: data.metadata || {},
    });
  }
}