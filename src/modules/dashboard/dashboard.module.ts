import { Module } from '@nestjs/common';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UserModule } from '../user/user.module';
import { TaskModule } from '../task/task.module';
import { GoalsModule } from '../goals/goals.module';

@Module({
  imports: [UserModule, TaskModule, GoalsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}