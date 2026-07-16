import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { GoalsService } from '../goals/services/goals.service';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  CompletionType,
  Task,
  TaskDocument,
  TaskStatus,
  TaskCategory,
  TaskPriority,
} from './task.model';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

import { User, UserDocument } from '../user/user.model';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @Inject(forwardRef(() => GoalsService))
    private readonly goalsService: GoalsService,
  ) {}

  async createTask(userId: string, createTaskDto: CreateTaskDto) {
    const task = await this.taskModel.create({
      userId: new Types.ObjectId(userId),
      title: createTaskDto.title,
      description: createTaskDto.description,
      dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
      priority: createTaskDto.priority,
      category: createTaskDto.category,
      completionType: createTaskDto.completionType,
      minimumCompletionMinutes: createTaskDto.minimumCompletionMinutes,
    });

    return {
      success: true,
      message: 'Task created successfully',
      data: task,
    };
  }

  async createTasksFromGoalPlan(params: {
    userId: string;
    goalId: string;
    goalPlanId: string;
    actions: any[];
  }) {
    const actions = params.actions || [];

    const executableActions = actions.filter(
      (action) => action.frequency === 'ONCE' || action.frequency === 'DAILY',
    );

    console.log(
      'Goal Actions:',
      executableActions.map((a) => ({
        key: a.key,
        frequency: a.frequency,
      })),
    );

    if (!executableActions.length) {
      return [];
    }

    const now = new Date();

    const tasksToCreate = executableActions.map((action) => ({
      userId: new Types.ObjectId(params.userId),
      title: action.title,
      description: action.description || '',
      dueDate: now,
      taskDate: now,
      priority: this.mapGoalPriorityToTaskPriority(action.priority),
      category: TaskCategory.WORK,
      status: TaskStatus.PENDING,
      completionType: CompletionType.SELF_CONFIRM,
      minimumCompletionMinutes:
        action.metadata?.defaultMinutes && action.metadata.defaultMinutes > 0
          ? action.metadata.defaultMinutes
          : 0,

      goalId: new Types.ObjectId(params.goalId),
      goalPlanId: new Types.ObjectId(params.goalPlanId),
      goalActionKey: action.key || null,
      goalActionType: action.actionType || null,
      goalActionFrequency: action.frequency || null,
      isGoalTask: true,
      isDeleted: false,
    }));

    return this.taskModel.insertMany(tasksToCreate);
  }

  // async getTasks(
  //   userId: string,
  //   cursor?: string,
  //   limit = 10,
  // ) {
  //   const pageLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

  //   const sevenDaysAgo = new Date();
  //   sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  //   sevenDaysAgo.setHours(0, 0, 0, 0);

  //   const filter: any = {
  //     userId: new Types.ObjectId(userId),
  //     isDeleted: false,
  //     status: {
  //       $in: [TaskStatus.PENDING, TaskStatus.MISSED],
  //     },
  //     dueDate: {
  //       $gte: sevenDaysAgo,
  //     },
  //   };

  //   if (cursor && Types.ObjectId.isValid(cursor)) {
  //     filter._id = {
  //       $lt: new Types.ObjectId(cursor),
  //     };
  //   }

  //   const tasks = await this.taskModel
  //     .find(filter)
  //     .select(
  //       '_id title description dueDate taskDate priority category status completionType minimumCompletionMinutes proofImage completedAt goalId goalPlanId goalActionKey goalActionType goalActionFrequency isGoalTask createdAt updatedAt',
  //     )
  //     .sort({ _id: -1 })
  //     .limit(pageLimit + 1)
  //     .lean();

  //   const hasMore = tasks.length > pageLimit;

  //   if (hasMore) {
  //     tasks.pop();
  //   }

  //   return {
  //     success: true,
  //     message: 'Tasks fetched successfully',
  //     data: tasks,
  //     pagination: {
  //       hasMore,
  //       nextCursor: hasMore ? tasks[tasks.length - 1]?._id : null,
  //     },
  //   };
  // }

  async getTasks(
    userId: string,
    cursor?: string,
    limit = 10,
    status?: string,
    date?: string,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    const pageLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const filter: any = {
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    };

    const normalizedStatus = status?.trim().toUpperCase();

    if (normalizedStatus && normalizedStatus !== 'ALL') {
      const validStatuses = Object.values(TaskStatus) as string[];

      if (!validStatuses.includes(normalizedStatus)) {
        throw new BadRequestException(
          `Invalid status. Allowed values: ALL, ${validStatuses.join(', ')}`,
        );
      }

      filter.status = normalizedStatus;
    }

    if (date?.trim()) {
      const { start, end } = this.getIndiaDateRange(date.trim());

      filter.$or = [
        {
          taskDate: {
            $gte: start,
            $lt: end,
          },
        },
        {
          dueDate: {
            $gte: start,
            $lt: end,
          },
        },
      ];
    }

    if (cursor) {
      if (!Types.ObjectId.isValid(cursor)) {
        throw new BadRequestException('Invalid task cursor');
      }

      filter._id = {
        $lt: new Types.ObjectId(cursor),
      };
    }

    const tasks = await this.taskModel
      .find(filter)
      .select(
        '_id title description dueDate taskDate priority category status completionType minimumCompletionMinutes proofImage completedAt goalId goalPlanId goalActionKey goalActionType goalActionFrequency isGoalTask createdAt updatedAt',
      )
      .sort({
        _id: -1,
      })
      .limit(pageLimit + 1)
      .lean();

    const hasMore = tasks.length > pageLimit;

    if (hasMore) {
      tasks.pop();
    }

    const nextCursor =
      hasMore && tasks.length ? tasks[tasks.length - 1]._id.toString() : null;

    return {
      success: true,
      message: 'Tasks fetched successfully',

      data: tasks,

      pagination: {
        limit: pageLimit,
        hasMore,
        nextCursor,
      },

      filters: {
        status: normalizedStatus || 'ALL',
        date: date?.trim() || null,
      },
    };
  }
  async getTodayTasks(userId: string) {
    const { start, end } = this.getTodayRange();

    const tasks = await this.taskModel
      .find({
        userId: new Types.ObjectId(userId),
        isDeleted: false,
        dueDate: {
          $gte: start,
          $lt: end,
        },
      })
      .sort({ dueDate: 1 });

    return {
      success: true,
      message: 'Today tasks fetched successfully',
      data: tasks,
    };
  }

  async getTaskById(userId: string, taskId: string) {
    const task = await this.findUserTask(userId, taskId);

    return {
      success: true,
      message: 'Task fetched successfully',
      data: task,
    };
  }

  async updateTask(
    userId: string,
    taskId: string,
    updateTaskDto: UpdateTaskDto,
  ) {
    await this.findUserTask(userId, taskId);

    const updatedTask = await this.taskModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      },
      {
        $set: {
          ...updateTaskDto,
          dueDate: updateTaskDto.dueDate
            ? new Date(updateTaskDto.dueDate)
            : undefined,
        },
      },
      { new: true },
    );

    return {
      success: true,
      message: 'Task updated successfully',
      data: updatedTask,
    };
  }

  async completeTask(userId: string, taskId: string) {
    const task = await this.findUserTask(userId, taskId);

    if (task.completionType === CompletionType.PHOTO_PROOF) {
      throw new BadRequestException(
        'This task requires photo proof to complete',
      );
    }

    this.validateTaskCompletion(task);

    const completedTask = await this.taskModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      },
      {
        $set: {
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
        },
      },
      { new: true },
    );

    await this.updateUserStreak(userId);

    if (completedTask?.isGoalTask) {
      await this.goalsService.handleGoalTaskCompleted(userId, completedTask);
    }
    return {
      success: true,
      message: 'Task completed successfully',
      data: completedTask,
    };
  }

  async completeTaskWithProof(
    userId: string,
    taskId: string,
    proofImage: string,
  ) {
    const task = await this.findUserTask(userId, taskId);

    if (task.completionType !== CompletionType.PHOTO_PROOF) {
      throw new BadRequestException('This task does not require photo proof');
    }

    if (!proofImage) {
      throw new BadRequestException('Proof image is required');
    }

    this.validateTaskCompletion(task);

    const completedTask = await this.taskModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      },
      {
        $set: {
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
          proofImage,
        },
      },
      { new: true },
    );

    await this.updateUserStreak(userId);

    if (completedTask?.isGoalTask) {
      await this.goalsService.handleGoalTaskCompleted(userId, completedTask);
    }

    return {
      success: true,
      message: 'Task completed with proof successfully',
      data: completedTask,
    };
  }

  async completeGoalTaskAutomatically(params: {
    userId: string;
    goalId: string;
    goalActionKey: string;
    start: Date;
    end: Date;
  }) {
    if (!Types.ObjectId.isValid(params.userId)) {
      throw new BadRequestException('Invalid user id');
    }

    if (!Types.ObjectId.isValid(params.goalId)) {
      throw new BadRequestException('Invalid goal id');
    }

    const completedTask = await this.taskModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(params.userId),
        goalId: new Types.ObjectId(params.goalId),

        goalActionKey: params.goalActionKey,

        isGoalTask: true,
        isDeleted: false,

        status: {
          $in: [TaskStatus.PENDING, TaskStatus.MISSED],
        },

        $or: [
          {
            taskDate: {
              $gte: params.start,
              $lt: params.end,
            },
          },
          {
            dueDate: {
              $gte: params.start,
              $lt: params.end,
            },
          },
        ],
      },
      {
        $set: {
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
        },
      },
      {
        new: true,
        sort: {
          createdAt: -1,
        },
      },
    );

    /*
     * No matching pending task was found, or the task
     * was already completed during a previous Gmail sync.
     */
    if (!completedTask) {
      return null;
    }

    await this.updateUserStreak(params.userId);

    await this.goalsService.handleGoalTaskCompleted(
      params.userId,
      completedTask,
    );

    return completedTask;
  }

  async deleteTask(userId: string, taskId: string) {
    await this.findUserTask(userId, taskId);

    await this.taskModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
        },
      },
    );

    return {
      success: true,
      message: 'Task deleted successfully',
      data: null,
    };
  }

  async getStreak(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('currentStreak longestStreak lastTaskCompletedDate');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'Task streak fetched successfully',
      data: {
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        lastTaskCompletedDate: user.lastTaskCompletedDate || null,
      },
    };
  }

  async getSummary(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const { start, end } = this.getTodayRange();

    const [
      totalTasks,
      completedTasks,
      pendingTasks,
      missedTasks,
      todayTasks,
      user,
    ] = await Promise.all([
      this.taskModel.countDocuments({
        userId: userObjectId,
        isDeleted: false,
      }),
      this.taskModel.countDocuments({
        userId: userObjectId,
        status: TaskStatus.COMPLETED,
        isDeleted: false,
      }),
      this.taskModel.countDocuments({
        userId: userObjectId,
        status: TaskStatus.PENDING,
        isDeleted: false,
      }),
      this.taskModel.countDocuments({
        userId: userObjectId,
        status: TaskStatus.MISSED,
        isDeleted: false,
      }),
      this.taskModel.countDocuments({
        userId: userObjectId,
        isDeleted: false,
        dueDate: {
          $gte: start,
          $lt: end,
        },
      }),
      this.userModel.findById(userId).select('currentStreak longestStreak'),
    ]);

    return {
      success: true,
      message: 'Task summary fetched successfully',
      data: {
        totalTasks,
        completedTasks,
        pendingTasks,
        missedTasks,
        todayTasks,
        currentStreak: user?.currentStreak || 0,
        longestStreak: user?.longestStreak || 0,
      },
    };
  }

  async getTaskSummaryData(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const { start, end } = this.getTodayRange();

    const [
      totalTasks,
      completedTasks,
      pendingTasks,
      missedTasks,
      todayTasksCount,
      todayTasks,
      user,
    ] = await Promise.all([
      this.taskModel.countDocuments({
        userId: userObjectId,
        isDeleted: false,
      }),
      this.taskModel.countDocuments({
        userId: userObjectId,
        status: TaskStatus.COMPLETED,
        isDeleted: false,
      }),
      this.taskModel.countDocuments({
        userId: userObjectId,
        status: TaskStatus.PENDING,
        isDeleted: false,
      }),
      this.taskModel.countDocuments({
        userId: userObjectId,
        status: TaskStatus.MISSED,
        isDeleted: false,
      }),
      this.taskModel.countDocuments({
        userId: userObjectId,
        isDeleted: false,
        dueDate: {
          $gte: start,
          $lt: end,
        },
      }),
      this.taskModel
        .find({
          userId: userObjectId,
          isDeleted: false,
          dueDate: {
            $gte: start,
            $lt: end,
          },
        })
        .sort({ dueDate: 1 })
        .limit(5),
      this.userModel.findById(userId).select('currentStreak longestStreak'),
    ]);

    const completionPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      missedTasks,
      todayTasksCount,
      todayTasks,
      completionPercentage,
      currentStreak: user?.currentStreak || 0,
      longestStreak: user?.longestStreak || 0,
      productivityScore: completionPercentage,
    };
  }

  async getRecentTaskActivity(userId: string) {
    const { start, end } = this.getTodayRange();

    const tasks = await this.taskModel
      .find({
        userId: new Types.ObjectId(userId),
        isDeleted: false,
        updatedAt: {
          $gte: start,
          $lt: end,
        },
      })
      .sort({
        updatedAt: -1,
      })
      .limit(5)
      .lean();

    return tasks.map((task) => ({
      type:
        task.status === TaskStatus.COMPLETED
          ? 'TASK_COMPLETED'
          : 'TASK_UPDATED',
      title: task.title,
      description:
        task.status === TaskStatus.COMPLETED
          ? `Completed ${task.title}`
          : `Updated ${task.title}`,
      date: task.completedAt || task.updatedAt || task.createdAt,
      icon:
        task.status === TaskStatus.COMPLETED
          ? 'checkmark-circle'
          : 'create-outline',
    }));
  }

  async getCompletedGoalActionKeys(
    userId: string,
    goalId: string,
  ): Promise<string[]> {
    const completedActionKeys = await this.taskModel.distinct('goalActionKey', {
      userId: new Types.ObjectId(userId),
      goalId: new Types.ObjectId(goalId),
      isGoalTask: true,
      isDeleted: false,
      status: TaskStatus.COMPLETED,
      goalActionKey: { $ne: null },
    });

    return completedActionKeys.filter(Boolean);
  }

  async getGoalTaskStats(userId: string, goalId: string) {
    const filter = {
      userId: new Types.ObjectId(userId),
      goalId: new Types.ObjectId(goalId),
      isGoalTask: true,
      isDeleted: false,
    };

    const [totalTasks, completedTasks] = await Promise.all([
      this.taskModel.countDocuments(filter),
      this.taskModel.countDocuments({
        ...filter,
        status: TaskStatus.COMPLETED,
      }),
    ]);

    const progressPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      progressPercentage,
    };
  }

  async createRecurringGoalTaskIfNotExists(params: {
    userId: string;
    goalId: string;
    goalPlanId: string;
    action: any;
    taskDate: Date;
  }) {
    const existingTask = await this.taskModel.findOne({
      userId: new Types.ObjectId(params.userId),
      goalId: new Types.ObjectId(params.goalId),
      goalActionKey: params.action.key,
      taskDate: params.taskDate,
      isGoalTask: true,
      isDeleted: false,
    });

    if (existingTask) {
      return existingTask;
    }

    return this.taskModel.create({
      userId: new Types.ObjectId(params.userId),

      title: params.action.title,
      description: params.action.description || '',

      dueDate: params.taskDate,
      taskDate: params.taskDate,

      priority: this.mapGoalPriorityToTaskPriority(params.action.priority),

      category: TaskCategory.WORK,

      status: TaskStatus.PENDING,

      completionType: CompletionType.SELF_CONFIRM,

      minimumCompletionMinutes:
        params.action.metadata?.defaultMinutes &&
        params.action.metadata.defaultMinutes > 0
          ? params.action.metadata.defaultMinutes
          : 0,

      goalId: new Types.ObjectId(params.goalId),
      goalPlanId: new Types.ObjectId(params.goalPlanId),

      goalActionKey: params.action.key || null,
      goalActionType: params.action.actionType || null,
      goalActionFrequency: params.action.frequency || null,

      isGoalTask: true,
      isDeleted: false,
    });
  }

  async markMissedGoalTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.taskModel.updateMany(
      {
        isGoalTask: true,
        isDeleted: false,
        status: TaskStatus.PENDING,
        dueDate: {
          $lt: today,
        },
      },
      {
        $set: {
          status: TaskStatus.MISSED,
        },
      },
    );
  }

  private mapGoalPriorityToTaskPriority(priority?: string) {
    if (priority === TaskPriority.HIGH) {
      return TaskPriority.HIGH;
    }

    if (priority === TaskPriority.LOW) {
      return TaskPriority.LOW;
    }

    return TaskPriority.MEDIUM;
  }

  private async findUserTask(userId: string, taskId: string) {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('Invalid task id');
    }

    const task = await this.taskModel.findOne({
      _id: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private validateTaskCompletion(task: TaskDocument) {
    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Task is already completed');
    }

    const createdAt = task.createdAt;

    const allowedCompletionTime = new Date(
      createdAt.getTime() + task.minimumCompletionMinutes * 60 * 1000,
    );

    if (new Date() < allowedCompletionTime) {
      throw new BadRequestException(
        `Task can be completed only after ${task.minimumCompletionMinutes} minutes`,
      );
    }
  }

  private async updateUserStreak(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const today = this.toDateOnly(new Date());

    const lastTaskCompletedDate = user.lastTaskCompletedDate
      ? this.toDateOnly(user.lastTaskCompletedDate)
      : null;

    if (!lastTaskCompletedDate) {
      user.currentStreak = 1;
    } else if (this.isSameDate(today, lastTaskCompletedDate)) {
      user.currentStreak = user.currentStreak || 1;
    } else if (this.isYesterday(lastTaskCompletedDate, today)) {
      user.currentStreak = (user.currentStreak || 0) + 1;
    } else {
      user.currentStreak = 1;
    }

    user.longestStreak = Math.max(
      user.longestStreak || 0,
      user.currentStreak || 0,
    );

    user.lastTaskCompletedDate = today;

    await user.save();
  }

  private getIndiaDateRange(date: string): {
    start: Date;
    end: Date;
  } {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!datePattern.test(date)) {
      throw new BadRequestException('Date must use YYYY-MM-DD format');
    }

    const [year, month, day] = date.split('-').map(Number);

    const validationDate = new Date(Date.UTC(year, month - 1, day));

    const isValidDate =
      validationDate.getUTCFullYear() === year &&
      validationDate.getUTCMonth() === month - 1 &&
      validationDate.getUTCDate() === day;

    if (!isValidDate) {
      throw new BadRequestException('Invalid task date');
    }

    const indiaOffsetMilliseconds = 5.5 * 60 * 60 * 1000;

    /*
     * Converts midnight in India to UTC.
     *
     * Example:
     * 15 July 00:00 IST
     * becomes
     * 14 July 18:30 UTC.
     */
    const start = new Date(
      Date.UTC(year, month - 1, day) - indiaOffsetMilliseconds,
    );

    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    return {
      start,
      end,
    };
  }

  private getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
  }

  private toDateOnly(date: Date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  private isSameDate(date1: Date, date2: Date) {
    return date1.getTime() === date2.getTime();
  }

  private isYesterday(previousDate: Date, currentDate: Date) {
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);

    return previousDate.getTime() === yesterday.getTime();
  }
}
