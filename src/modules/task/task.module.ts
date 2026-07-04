import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Task, TaskSchema } from './task.model';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

import { User, UserSchema } from '../user/user.model';
import { GoalsModule } from '../goals/goals.module';

@Module({
  imports: [
    forwardRef(() => GoalsModule),

    MongooseModule.forFeature([
      {
        name: Task.name,
        schema: TaskSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}