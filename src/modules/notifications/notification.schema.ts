import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({
    required: true,
    enum: ['TASK', 'GMAIL', 'CALENDAR', 'SYSTEM'],
    default: 'SYSTEM',
    index: true,
  })
  source: string;

  @Prop({
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM',
  })
  priority: string;

  @Prop({ default: true })
  isPersistent: boolean;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop({ default: null })
  actionUrl?: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: null })
  readAt?: Date;

  @Prop({
  default: null,
  index: true,
    })
    externalId?: string;

    @Prop({
    default: null,
    unique: true,
    sparse: true,
    index: true,
    })
    uniqueKey?: string;

    @Prop({
    type: Types.ObjectId,
    ref: 'ConnectedAccount',
    default: null,
    })
    accountId?: Types.ObjectId;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);