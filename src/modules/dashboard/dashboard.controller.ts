import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';

import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  async getDashboardOverview(@Req() req: Request) {
    const user = req.user as any;

    return this.dashboardService.getOverview(user);
  }
}