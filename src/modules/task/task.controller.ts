import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';

import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  createTask(@Req() req: any, @Body() createTaskDto: CreateTaskDto) {
    return this.taskService.createTask(req.user.userId, createTaskDto);
  }

  @Get()
  getTasks(@Req() req: any) {
    return this.taskService.getTasks(req.user.userId);
  }

  @Get('today')
  getTodayTasks(@Req() req: any) {
    return this.taskService.getTodayTasks(req.user.userId);
  }

  @Get('streak')
  getStreak(@Req() req: any) {
    return this.taskService.getStreak(req.user.userId);
  }

  @Get('summary')
  getSummary(@Req() req: any) {
    return this.taskService.getSummary(req.user.userId);
  }

  @Get(':id')
  getTaskById(@Req() req: any, @Param('id') taskId: string) {
    return this.taskService.getTaskById(req.user.userId, taskId);
  }

  @Patch(':id')
  updateTask(
    @Req() req: any,
    @Param('id') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.taskService.updateTask(
      req.user.userId,
      taskId,
      updateTaskDto,
    );
  }

  @Patch(':id/complete')
  completeTask(@Req() req: any, @Param('id') taskId: string) {
    return this.taskService.completeTask(req.user.userId, taskId);
  }

  @Patch(':id/complete-with-proof')
  completeTaskWithProof(
    @Req() req: any,
    @Param('id') taskId: string,
    @Body('proofImage') proofImage: string,
  ) {
    return this.taskService.completeTaskWithProof(
      req.user.userId,
      taskId,
      proofImage,
    );
  }

  @Delete(':id')
  deleteTask(@Req() req: any, @Param('id') taskId: string) {
    return this.taskService.deleteTask(req.user.userId, taskId);
  }
}