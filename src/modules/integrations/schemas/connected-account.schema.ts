import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConnectedAccountDocument = HydratedDocument<ConnectedAccount>;

export enum ConnectedProvider {
  GOOGLE = 'GOOGLE',
}

export enum ConnectedAccountType {
  PERSONAL = 'PERSONAL',
  WORK = 'WORK',
}

export enum ConnectedService {
  GMAIL = 'GMAIL',
  CALENDAR = 'CALENDAR',
}

@Schema({
  timestamps: true,
  collection: 'connectedaccounts',
})
export class ConnectedAccount {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ConnectedProvider,
    default: ConnectedProvider.GOOGLE,
  })
  provider: ConnectedProvider;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true })
  accessToken: string;

  @Prop()
  refreshToken?: string;

  @Prop()
  expiryDate?: number;

  @Prop({ type: [String], default: [] })
  scopes: string[];

  @Prop({ default: true })
  isConnected: boolean;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({
    type: [String],
    enum: ConnectedService,
    default: [ConnectedService.GMAIL, ConnectedService.CALENDAR],
  })
  enabledServices: ConnectedService[];

  @Prop({
    enum: ConnectedAccountType,
    default: ConnectedAccountType.PERSONAL,
  })
  accountType: ConnectedAccountType;

  @Prop({ default: Date.now })
  connectedAt: Date;

  @Prop()
  lastSyncAt?: Date;

  @Prop()
  lastNotificationSyncedAt?: Date;

  // Keep this temporarily for old data compatibility
  @Prop()
  lastSyncedAt?: Date;
}

export const ConnectedAccountSchema =
  SchemaFactory.createForClass(ConnectedAccount);

ConnectedAccountSchema.index(
  { userId: 1, provider: 1, email: 1 },
  { unique: true },
);

ConnectedAccountSchema.index({
  userId: 1,
  provider: 1,
  isDefault: 1,
});
