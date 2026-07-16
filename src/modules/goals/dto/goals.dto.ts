// src/modules/goals/dto/goals.dto.ts

import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  GoalCategory,
  GoalStatus,
  GoalTemplateKey,
  GoalType,
  RecruiterStatus,
} from '../enums/goals.enum';

export class CreateGoalDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(GoalCategory)
  category: GoalCategory;

  @IsEnum(GoalTemplateKey)
  templateKey: GoalTemplateKey;

  @IsDateString()
  targetDate: string;

  @IsOptional()
  @IsObject()
  setupAnswers?: Record<string, any>;

  @IsOptional()
  @IsEnum(GoalType)
  goalType?: GoalType;

  @IsOptional()
  @IsBoolean()
  useAiPlan?: true;

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

export class GoalTemplateParamDto {
  @IsEnum(GoalTemplateKey)
  templateKey: GoalTemplateKey;
}

export class GoalIdParamDto {
  @IsMongoId()
  goalId: string;
}
