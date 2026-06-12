import { Injectable, Logger } from '@nestjs/common';

import { UserService } from '../user/user.service';
import { TaskService } from '../task/task.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly userService: UserService,
    private readonly taskService: TaskService,
  ) {}

  async getOverview(authUser: any) {
    const userId =
      authUser?.userId || authUser?.sub || authUser?.id || authUser?._id;

    this.logger.log(`Fetching dashboard overview for userId: ${userId}`);

    const [user, taskSummary] = await Promise.all([
      this.userService.findById(userId),
      this.taskService.getTaskSummaryData(userId),
    ]);

    const firstName = user?.firstName || 'User';
    const lastName = user?.lastName || '';

    const hasTasks = taskSummary.totalTasks > 0;

    return {
      success: true,
      message: 'Dashboard overview fetched successfully',
      data: {
        isNewUser: !hasTasks,

        user: {
          id: userId,
          firstName,
          lastName,
          email: user?.email || authUser?.email || null,
          phoneNumber: user?.phoneNumber || null,
          profilePicture: user?.profilePicture || null,
          status: user?.status || null,
        },

        greeting: {
          message: this.getGreetingMessage(),
          date: new Date().toISOString().split('T')[0],
          day: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
          }),
        },

        summary: {
          totalTasks: taskSummary.totalTasks,
          completedTasks: taskSummary.completedTasks,
          pendingTasks: taskSummary.pendingTasks,
          activeGoals: 0,
          monthlyExpense: 0,
          productivityScore: taskSummary.productivityScore,
        },

        todayFocus: hasTasks
          ? {
              title: 'Keep your momentum going',
              description:
                'Complete at least one task today to continue your streak.',
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
          totalGoals: 0,
          activeGoals: 0,
          completedGoals: 0,
          overallProgress: 0,
          items: [],
          emptyState: {
            title: 'No goals yet',
            description: 'Create your first goal to track progress.',
            cta: 'Create Goal',
          },
        },

        budget: {
          monthlyIncome: 0,
          monthlyExpense: 0,
          monthlySavings: 0,
          savingsRate: 0,
          currency: 'INR',
          emptyState: {
            title: 'Budget not set',
            description: 'Add income or expenses to see insights.',
            cta: 'Set Budget',
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
            title: 'Create your first goal',
            description: 'Track something important',
          },
        ],

        recentActivity: [],
      },
    };
  }

  private getGreetingMessage(): string {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good Morning';

    if (hour < 17) return 'Good Afternoon';

    return 'Good Evening';
  }
}