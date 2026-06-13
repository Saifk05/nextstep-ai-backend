import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConnectedAccountDocument = HydratedDocument<ConnectedAccount>;

@Schema({ timestamps: true })
export class ConnectedAccount {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['GOOGLE'] })
  provider: string;

  @Prop()
  email: string;

  @Prop()
  accessToken: string;

  @Prop()
  refreshToken: string;

  @Prop()
  expiryDate: number;

  @Prop({ type: [String], default: [] })
  scopes: string[];

  @Prop({ default: true })
  isConnected: boolean;

  @Prop({ default: Date.now })
  connectedAt: Date;

  @Prop()
  lastSyncedAt?: Date;
}

export const ConnectedAccountSchema =
  SchemaFactory.createForClass(ConnectedAccount);

ConnectedAccountSchema.index(
  { userId: 1, provider: 1 },
  { unique: true },
);