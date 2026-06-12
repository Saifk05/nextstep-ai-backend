import { Module } from '@nestjs/common';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UserModule } from '../user/user.module';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [UserModule, TaskModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}