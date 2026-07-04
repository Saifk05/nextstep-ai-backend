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

    const executableActions = actions.filter((action) =>
      ['ONCE', 'DAILY', 'WEEKLY'].includes(action.frequency),
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

  async getTasks(userId: string) {
    const tasks = await this.taskModel
      .find({
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      })
      .sort({ createdAt: -1 });

    return {
      success: true,
      message: 'Tasks fetched successfully',
      data: tasks,
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
      throw new BadRequestException(
        'This task does not require photo proof',
      );
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

    const createdAt = task.createdAt as Date;

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