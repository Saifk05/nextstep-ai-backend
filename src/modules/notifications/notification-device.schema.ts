import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDeviceDocument = HydratedDocument<NotificationDevice>;

@Schema({ timestamps: true })
export class NotificationDevice {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  token: string;

  @Prop({
    required: true,
    enum: ['ANDROID', 'IOS', 'WEB'],
    default: 'ANDROID',
  })
  platform: string;

  @Prop({ default: null })
  deviceName?: string;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: null })
  lastUsedAt?: Date;
}

export const NotificationDeviceSchema =
  SchemaFactory.createForClass(NotificationDevice);

NotificationDeviceSchema.index({ userId: 1, token: 1 }, { unique: true });
