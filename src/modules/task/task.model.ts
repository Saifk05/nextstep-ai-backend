import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TaskDocument = HydratedDocument<Task> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TaskCategory {
  PERSONAL = 'PERSONAL',
  WORK = 'WORK',
  STUDY = 'STUDY',
  HEALTH = 'HEALTH',
  FINANCE = 'FINANCE',
  OTHER = 'OTHER',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
}

export enum CompletionType {
  SELF_CONFIRM = 'SELF_CONFIRM',
  PHOTO_PROOF = 'PHOTO_PROOF',
}

@Schema({
  timestamps: true,
  collection: 'tasks',
})
export class Task {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  title: string;

  @Prop({
    trim: true,
    default: '',
  })
  description: string;

  @Prop({
    type: Date,
    default: null,
    index: true,
  })
  dueDate: Date | null;

  @Prop({
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Prop({
    enum: TaskCategory,
    default: TaskCategory.PERSONAL,
  })
  category: TaskCategory;

  @Prop({
    enum: TaskStatus,
    default: TaskStatus.PENDING,
    index: true,
  })
  status: TaskStatus;

  @Prop({
    enum: CompletionType,
    default: CompletionType.SELF_CONFIRM,
  })
  completionType: CompletionType;

  @Prop({
    type: Number,
    default: 15,
    min: 0,
    max: 1440,
  })
  minimumCompletionMinutes: number;

  @Prop({
    default: null,
  })
  proofImage: string | null;

  @Prop({
    type: Date,
    default: null,
  })
  completedAt: Date | null;

  @Prop({
    default: false,
    index: true,
  })
  isDeleted: boolean;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

TaskSchema.index({ userId: 1, createdAt: -1 });
TaskSchema.index({ userId: 1, dueDate: 1 });
TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, isDeleted: 1 });