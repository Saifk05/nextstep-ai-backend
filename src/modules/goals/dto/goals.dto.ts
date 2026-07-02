import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  GoalStatus,
  GoalType,
  RecruiterStatus,
} from '../enums/goals.enum';

export class CreateGoalDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(GoalType)
  goalType?: GoalType;

  @IsDateString()
  targetDate: string;

  @IsOptional()
  @IsBoolean()
  useAiPlan?: boolean = true;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dailyActions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  weeklyActions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  milestones?: string[];
}

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(GoalType)
  goalType?: GoalType;

  @IsOptional()
  @IsDateString()
  targetDate?: string;
}

export class UpdateGoalStatusDto {
  @IsEnum(GoalStatus)
  status: GoalStatus;
}

export class CreateRecruiterDto {
  @IsString()
  company: string;

  @IsString()
  recruiterName: string;

  @IsEmail()
  recruiterEmail: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRecruiterDto {
  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  recruiterName?: string;

  @IsOptional()
  @IsEmail()
  recruiterEmail?: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsOptional()
  @IsEnum(RecruiterStatus)
  status?: RecruiterStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class GoalIdParamDto {
  @IsMongoId()
  goalId: string;
}