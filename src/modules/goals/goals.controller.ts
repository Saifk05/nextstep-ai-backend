import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';

import { GoalsService } from './services/goals.service';
import { GoalsGmailService } from './services/goals-gmail.service';

import {
  CreateGoalDto,
  UpdateGoalDto,
  UpdateGoalStatusDto,
} from './dto/goals.dto';

@Controller('goals')
export class GoalsController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly goalsGmailService: GoalsGmailService,
  ) {}

  @Post()
  createGoal(@Req() req, @Body() dto: CreateGoalDto) {
    return this.goalsService.createGoal(req.user.userId, dto);
  }

  @Get('active')
  getActiveGoals(@Req() req) {
    return this.goalsService.getActiveGoals(req.user.userId);
  }

  @Get(':goalId')
  getGoalById(@Req() req, @Param('goalId') goalId: string) {
    return this.goalsService.getGoalById(req.user.userId, goalId);
  }

  @Patch(':goalId')
  updateGoal(
    @Req() req,
    @Param('goalId') goalId: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.updateGoal(req.user.userId, goalId, dto);
  }

  @Patch(':goalId/status')
  updateGoalStatus(
    @Req() req,
    @Param('goalId') goalId: string,
    @Body() dto: UpdateGoalStatusDto,
  ) {
    return this.goalsService.updateGoalStatus(req.user.userId, goalId, dto);
  }

  @Get(':goalId/plan')
  getGoalPlan(@Req() req, @Param('goalId') goalId: string) {
    return this.goalsService.getGoalPlan(req.user.userId, goalId);
  }

  @Post(':goalId/regenerate-plan')
  regenerateGoalPlan(@Req() req, @Param('goalId') goalId: string) {
    return this.goalsService.regenerateGoalPlan(req.user.userId, goalId);
  }

  @Get(':goalId/activity')
  getGoalActivity(@Req() req, @Param('goalId') goalId: string) {
    return this.goalsService.getGoalActivity(req.user.userId, goalId);
  }

  @Post(':goalId/sync-gmail')
  syncGoalGmail(@Req() req, @Param('goalId') goalId: string) {
    return this.goalsGmailService.syncGoalGmail(req.user.userId, goalId);
  }
}