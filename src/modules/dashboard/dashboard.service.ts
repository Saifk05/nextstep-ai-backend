import { Injectable, Logger } from '@nestjs/common';

import { UserService } from '../user/user.service';
import { TaskService } from '../task/task.service';
import { GoalsService } from '../goals/services/goals.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly timeZone = 'Asia/Kolkata';

  constructor(
    private readonly userService: UserService,
    private readonly taskService: TaskService,
    private readonly goalsService: GoalsService,
  ) {}

  async getOverview(authUser: any) {
    const userId =
      authUser?.userId || authUser?.sub || authUser?.id || authUser?._id;

    this.logger.log(`Fetching dashboard overview for userId: ${userId}`);

    const [user, taskSummary, recentActivity, goalDashboardData] =
      await Promise.all([
        this.userService.findById(userId),
        this.taskService.getTaskSummaryData(userId),
        this.taskService.getRecentTaskActivity(userId),
        this.goalsService.getGoalDashboardData(userId),
      ]);

    const firstName = user?.firstName || 'User';
    const hasTasks = taskSummary.totalTasks > 0;
    const hasGoals = goalDashboardData.activeGoals.length > 0;

    const overallGoalProgress = hasGoals
      ? Math.round(
          goalDashboardData.activeGoals.reduce(
            (sum, goal) => sum + (goal.progressPercentage || 0),
            0,
          ) / goalDashboardData.activeGoals.length,
        )
      : 0;

    return {
      success: true,
      message: 'Dashboard overview fetched successfully',
      data: {
        isNewUser: !hasTasks && !hasGoals,

        user: {
          id: userId,
          firstName,
          email: user?.email || authUser?.email || null,
          profilePicture: user?.profilePicture || null,
        },

        greeting: {
          message: this.getGreetingMessage(),
          date: this.getLocalDate(),
          day: this.getLocalDay(),
        },

        summary: {
          totalTasks: taskSummary.totalTasks,
          completedTasks: taskSummary.completedTasks,
          pendingTasks: taskSummary.pendingTasks,
          activeGoals: goalDashboardData.activeGoals.length,
          productivityScore: taskSummary.productivityScore,
        },

        todayFocus:
          hasTasks || hasGoals
            ? {
                title: 'Keep your momentum going',
                description:
                  'Complete at least one task or goal action today to continue your streak.',
              }
            : {
                title: 'Start your day with one small step',
                description:
                  'Add your first task or goal to begin planning with NextStep AI.',
              },

        tasks: {
          total: taskSummary.totalTasks,
          completed: taskSummary.completedTasks,
          pending: taskSummary.pendingTasks,
          missed: taskSummary.missedTasks,
          completionPercentage: taskSummary.completionPercentage,
          todayTasks: taskSummary.todayTasks,
          todayTasksCount: taskSummary.todayTasksCount,
          emptyState: {
            title: 'No tasks yet',
            description: 'Add your first task to plan your day.',
            cta: 'Add Task',
          },
        },

        goals: {
          totalGoals: goalDashboardData.activeGoals.length,
          activeGoals: goalDashboardData.activeGoals.length,
          completedGoals: goalDashboardData.completedGoalsCount,
          overallProgress: overallGoalProgress,
          items: goalDashboardData.activeGoals,
          emptyState: {
            title: 'No goals yet',
            description: 'Create your first goal to track progress.',
            cta: 'Create Goal',
          },
        },

        productivity: {
          todayScore: taskSummary.productivityScore,
          weeklyScore: taskSummary.productivityScore,
          currentStreak: taskSummary.currentStreak,
          bestStreak: taskSummary.longestStreak,
        },

        quickActions: [
          {
            type: 'CREATE_TASK',
            title: hasTasks ? 'Add another task' : 'Add your first task',
            description: 'Start planning your day',
          },
          {
            type: 'CREATE_GOAL',
            title: hasGoals ? 'Add another goal' : 'Create your first goal',
            description: 'Track something important',
          },
        ],

        recentActivity,
      },
    };
  }

  private getGreetingMessage(): string {
    const hour = Number(
      new Date().toLocaleString('en-US', {
        timeZone: this.timeZone,
        hour: 'numeric',
        hour12: false,
      }),
    );

    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  private getLocalDate(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private getLocalDay(): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: this.timeZone,
      weekday: 'long',
    }).format(new Date());
  }
}
