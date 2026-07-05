import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Goal, GoalDocument } from '../schemas/goal.schema';
import { GoalPlan, GoalPlanDocument } from '../schemas/goal-plan.schema';
import { GoalStatus } from '../enums/goals.enum';

import { TaskService } from '../../task/task.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class GoalTaskSchedulerService {
  private readonly logger = new Logger(GoalTaskSchedulerService.name);

  constructor(
    @InjectModel(Goal.name)
    private readonly goalModel: Model<GoalDocument>,

    @InjectModel(GoalPlan.name)
    private readonly goalPlanModel: Model<GoalPlanDocument>,

    private readonly taskService: TaskService,

    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('*/1 * * * *')
  // @Cron('5 0 * * *')
  async generateDailyGoalTasks() {
    this.logger.log('Daily goal task scheduler started');

    const taskDate = this.getStartOfToday();

    await this.generateRecurringGoalTasks('DAILY', taskDate);

    this.logger.log('Daily goal task scheduler completed');
  }

  @Cron('*/1 * * * *')

  // @Cron('10 0 * * 1')
  async generateWeeklyGoalTasks() {
    this.logger.log('Weekly goal task scheduler started');

    const taskDate = this.getStartOfWeek();

    await this.generateRecurringGoalTasks('WEEKLY', taskDate);

    this.logger.log('Weekly goal task scheduler completed');
  }

  @Cron('15 0 * * *')
  async markMissedGoalTasks() {
    this.logger.log('Missed goal task scheduler started');

    const result = await this.taskService.markMissedGoalTasks();

    this.logger.log(
      `Missed goal task scheduler completed. Modified: ${result.modifiedCount}`,
    );
  }

  private async generateRecurringGoalTasks(
    frequency: 'DAILY' | 'WEEKLY',
    taskDate: Date,
  ) {
    const activeGoals = await this.goalModel
      .find({
        status: GoalStatus.ACTIVE,
      })
      .lean();

    this.logger.log(
      `Active goals found for ${frequency}: ${activeGoals.length}`,
    );

    for (const goal of activeGoals) {
      try {
        const plan = await this.goalPlanModel
          .findOne({
            goalId: goal._id,
            userId: goal.userId,
            isActive: true,
          })
          .lean();

        if (!plan) {
          this.logger.warn(`No active plan found for goal ${goal._id}`);
          continue;
        }

        const actions = (plan.actions || []).filter(
          (action: any) => action.frequency === frequency,
        );

        if (!actions.length) {
          continue;
        }

        let createdCount = 0;

        for (const action of actions) {
          const task = await this.taskService.createRecurringGoalTaskIfNotExists({
            userId: goal.userId.toString(),
            goalId: goal._id.toString(),
            goalPlanId: plan._id.toString(),
            action,
            taskDate,
          });

          if (task?.createdAt?.getTime?.() === task?.updatedAt?.getTime?.()) {
            createdCount++;
          }
        }

        if (createdCount > 0) {
        try {
            await this.notificationsService.createNotification({
            userId: goal.userId as Types.ObjectId,
            title:
                frequency === 'DAILY'
                ? 'Today’s Goal Tasks Ready'
                : 'This Week’s Goal Tasks Ready',
            message: `${createdCount} ${frequency.toLowerCase()} task(s) created for ${goal.title}`,
            source: 'TASK',
            priority: 'MEDIUM',
            uniqueKey: `${goal.userId}_${goal._id}_${frequency}_${taskDate.toISOString()}`,
            metadata: {
                goalId: goal._id.toString(),
                frequency,
                taskDate,
                createdCount,
            },
            isPersistent: true,
            isRead: false,
            });
        } catch (error) {
            if (error?.code === 11000) {
            this.logger.log(
                `Duplicate goal notification skipped for goal ${goal._id} ${frequency}`,
            );
            } else {
            throw error;
            }
        }
        }
      } catch (error) {
        this.logger.error(
        `Failed to generate ${frequency} tasks for goal ${goal._id}`,
        );

        this.logger.error({
        message: error?.message,
        code: error?.code,
        keyPattern: error?.keyPattern,
        keyValue: error?.keyValue,
        });
      }
    }
  }

  private getStartOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

    private getStartOfWeek() {
    const now = new Date();

    const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
    );

    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    date.setDate(date.getDate() + diff);

    return date;
    }  
}