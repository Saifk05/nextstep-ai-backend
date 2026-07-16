import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { CompletionType, TaskCategory, TaskPriority } from '../task.model';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsEnum(TaskCategory)
  @IsOptional()
  category?: TaskCategory;

  @IsEnum(CompletionType)
  @IsOptional()
  completionType?: CompletionType;

  @IsInt()
  @Min(0)
  @Max(1440)
  @IsOptional()
  minimumCompletionMinutes?: number;
}
