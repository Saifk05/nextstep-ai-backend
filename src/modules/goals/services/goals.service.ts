// src/modules/goals/services/goals.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { AiService } from '../../../common/ai/ai.service';

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

import { ActivityType, GoalStatus, GoalType } from '../enums/goals.enum';

@Injectable()
export class GoalsService {
  constructor(
    @InjectModel(Goal.name)
    private readonly goalModel: Model<GoalDocument>,

    @InjectModel(GoalPlan.name)
    private readonly goalPlanModel: Model<GoalPlanDocument>,

    @InjectModel(GoalActivity.name)
    private readonly activityModel: Model<GoalActivityDocument>,

    private readonly aiService: AiService,
  ) {}

    async createGoal(userId: string, dto: CreateGoalDto) {
    const normalizedTitle = dto.title.trim();
    const targetDate = new Date(dto.targetDate);

    if (targetDate < new Date()) {
        throw new BadRequestException('Target date must be in the future');
    }

    const existingGoal = await this.goalModel.findOne({
        userId,
        title: {
        $regex: `^${normalizedTitle}$`,
        $options: 'i',
        },
    });

    if (existingGoal) {
        throw new BadRequestException('A goal with this title already exists');
    }

    const goal = await this.goalModel.create({
        userId: new Types.ObjectId(userId),
        title: normalizedTitle,
        description: dto.description?.trim(),
        goalType: dto.goalType || GoalType.CUSTOM,
        targetDate,
        status: GoalStatus.ACTIVE,
        progressPercentage: 0,
    });

    let plan;

    if (dto.useAiPlan === false) {
        const hasManualPlan =
        (dto.dailyActions?.length || 0) > 0 ||
        (dto.weeklyActions?.length || 0) > 0 ||
        (dto.milestones?.length || 0) > 0;

        if (!hasManualPlan) {
        throw new BadRequestException(
            'Manual goal requires at least one daily action, weekly action, or milestone',
        );
        }

        plan = await this.goalPlanModel.create({
        userId: goal.userId,
        goalId: goal._id,
        dailyActions: this.toPlanItems(dto.dailyActions || []),
        weeklyActions: this.toPlanItems(dto.weeklyActions || []),
        milestones: this.toPlanItems(dto.milestones || []),
        strategySummary: 'Manual goal plan',
        isActive: true,
        });
    } else {
        const aiPlan = await this.aiService.generateGoalPlan({
        title: goal.title,
        description: goal.description,
        targetDate: goal.targetDate,
        });

        goal.goalType = aiPlan.goalType || goal.goalType;
        goal.aiPlanSummary = aiPlan.strategySummary;
        await goal.save();

        plan = await this.goalPlanModel.create({
        userId: goal.userId,
        goalId: goal._id,
        dailyActions: this.toPlanItems(aiPlan.dailyActions),
        weeklyActions: this.toPlanItems(aiPlan.weeklyActions),
        milestones: this.toPlanItems(aiPlan.milestones),
        strategySummary: aiPlan.strategySummary,
        isActive: true,
        });

        await this.createActivity({
        userId,
        goalId: goal._id.toString(),
        type: ActivityType.AI_PLAN_GENERATED,
        message: 'AI plan generated successfully',
        metadata: {
            goalType: goal.goalType,
        },
        });
    }

    await this.createActivity({
        userId,
        goalId: goal._id.toString(),
        type: ActivityType.GOAL_CREATED,
        message: `Goal created: ${goal.title}`,
    });

    return this.mapGoalResponse(goal, plan);
    }

    async getActiveGoals(userId: string) {
    const goals = await this.goalModel
        .find({
        userId: new Types.ObjectId(userId),
        status: GoalStatus.ACTIVE,
        })
        .sort({ createdAt: -1 })
        .lean();

    return goals.map((goal) => this.mapGoalResponse(goal));
    }

  async getGoalById(userId: string, goalId: string) {
    const goal = await this.goalModel.findOne({ _id: goalId, userId }).lean();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const plan = await this.goalPlanModel
      .findOne({
        userId,
        goalId,
        isActive: true,
      })
      .lean();

    const recentActivity = await this.activityModel
      .find({
        userId,
        goalId,
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
        _id: { $ne: goalId },
        userId,
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

    if (dto.goalType) {
      updateData.goalType = dto.goalType;
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
        _id: goalId,
        userId,
      },
      updateData,
      {
        new: true,
      },
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
        _id: goalId,
        userId,
      },
      {
        status: dto.status,
      },
      {
        new: true,
      },
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
      _id: goalId,
      userId,
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    await this.goalPlanModel.updateMany(
      {
        userId,
        goalId,
        isActive: true,
      },
      {
        isActive: false,
      },
    );

    const aiPlan = await this.aiService.generateGoalPlan({
      title: goal.title,
      description: goal.description,
      targetDate: goal.targetDate,
    });

    goal.goalType = aiPlan.goalType || goal.goalType;
    goal.aiPlanSummary = aiPlan.strategySummary;
    await goal.save();

    const newPlan = await this.goalPlanModel.create({
      userId: goal.userId,
      goalId: goal._id,
      dailyActions: this.toPlanItems(aiPlan.dailyActions),
      weeklyActions: this.toPlanItems(aiPlan.weeklyActions),
      milestones: this.toPlanItems(aiPlan.milestones),
      strategySummary: aiPlan.strategySummary,
      isActive: true,
    });

    await this.createActivity({
      userId,
      goalId,
      type: ActivityType.AI_PLAN_GENERATED,
      message: 'AI plan regenerated successfully',
      metadata: {
        goalType: goal.goalType,
      },
    });

    return this.mapGoalResponse(goal, newPlan);
  }

  async getGoalActivity(userId: string, goalId: string) {
    await this.ensureGoalBelongsToUser(userId, goalId);

    return this.activityModel
      .find({
        userId,
        goalId,
      })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
  }

  async getGoalPlan(userId: string, goalId: string) {
    await this.ensureGoalBelongsToUser(userId, goalId);

    const plan = await this.goalPlanModel
      .findOne({
        userId,
        goalId,
        isActive: true,
      })
      .lean();

    if (!plan) {
      return null;
    }

    return {
      id: plan._id?.toString(),
      strategySummary: plan.strategySummary,
      dailyActions: plan.dailyActions || [],
      weeklyActions: plan.weeklyActions || [],
      milestones: plan.milestones || [],
    };
  }

  async getGoalDashboardData(userId: string) {
    const activeGoals = await this.goalModel
        .find({
        userId: new Types.ObjectId(userId),
        status: GoalStatus.ACTIVE,
        })
        .sort({ createdAt: -1 })
        .select('_id title goalType status progressPercentage targetDate')
        .lean();

    const completedGoalsCount = await this.goalModel.countDocuments({
        userId: new Types.ObjectId(userId),
        status: GoalStatus.COMPLETED,
    });

    return {
        activeGoals: activeGoals.map((goal) => ({
        id: goal._id?.toString(),
        title: goal.title,
        goalType: goal.goalType,
        status: goal.status,
        targetDate: goal.targetDate,
        progressPercentage: goal.progressPercentage || 0,
        })),
        completedGoalsCount,
    };
    }

  private async ensureGoalBelongsToUser(userId: string, goalId: string) {
    const exists = await this.goalModel.exists({
      _id: goalId,
      userId,
    });

    if (!exists) {
      throw new NotFoundException('Goal not found');
    }
  }

  private toPlanItems(items: string[] = []) {
    return items.map((title) => ({
      title,
      completed: false,
    }));
  }

  private mapGoalResponse(goal: any, plan?: any, recentActivity: any[] = []) {
    return {
      id: goal._id?.toString(),
      title: goal.title,
      description: goal.description,
      goalType: goal.goalType,
      status: goal.status,
      targetDate: goal.targetDate,
      progressPercentage: goal.progressPercentage || 0,
      aiPlanSummary: goal.aiPlanSummary,
      metrics: {
        emailsSent: goal.metrics?.emailsSent || 0,
        replies: goal.metrics?.replies || 0,
        interviews: goal.metrics?.interviews || 0,
        offers: goal.metrics?.offers || 0,
        rejections: goal.metrics?.rejections || 0,
        followUpsDue: goal.metrics?.followUpsDue || 0,
        applicationsSubmitted: goal.metrics?.applicationsSubmitted || 0,
      },
      plan: plan
        ? {
            id: plan._id?.toString(),
            strategySummary: plan.strategySummary,
            dailyActions: plan.dailyActions || [],
            weeklyActions: plan.weeklyActions || [],
            milestones: plan.milestones || [],
          }
        : null,
      recentActivity,
    };
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