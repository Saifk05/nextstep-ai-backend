import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BLOCKED = 'BLOCKED',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

@Schema({
  timestamps: true,
  collection: 'users',
  minimize: true,
})
export class User {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({
    required: true,
    trim: true,
  })
  phoneNumber: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({
    unique: true,
    sparse: true,
    index: true,
  })
  googleId?: string;

  @Prop()
  profilePicture?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({
    enum: Gender,
  })
  gender?: Gender;

  @Prop({
    type: {
      label: { type: String },

      line1: { type: String },
      line2: { type: String },

      city: { type: String },
      state: { type: String },
      country: { type: String },

      pincode: { type: String },

      latitude: { type: Number },
      longitude: { type: Number },
    },
    default: undefined,
  })
  address?: {
    label?: string;

    line1?: string;
    line2?: string;

    city?: string;
    state?: string;
    country?: string;

    pincode?: string;

    latitude?: number;
    longitude?: number;
  };

  @Prop({
    type: {
      code: { type: String },
      expiresAt: { type: Date },
      verified: { type: Boolean, default: false },
    },
    default: undefined,
  })
  otp?: {
    code?: string;
    expiresAt?: Date;
    verified?: boolean;
  };

  @Prop()
  accessToken?: string;

  @Prop()
  refreshToken?: string;

  @Prop({ default: 0 })
  failedAttempts: number;

  @Prop({ default: false })
  isAccountLocked: boolean;

  @Prop({
    enum: UserStatus,
    default: UserStatus.OFFLINE,
  })
  status: UserStatus;

  @Prop({
    type: {
      gmailConnected: { type: Boolean, default: false },
      calendarConnected: { type: Boolean, default: false },
    },
    default: {
      gmailConnected: false,
      calendarConnected: false,
    },
  })
  onboardingStatus: {
    gmailConnected: boolean;
    calendarConnected: boolean;
  };

  @Prop()
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set('toJSON', {
  versionKey: false,
});

UserSchema.set('toObject', {
  versionKey: false,
});