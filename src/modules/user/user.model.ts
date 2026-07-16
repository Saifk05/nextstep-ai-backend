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
    required: false,
    trim: true,
    default: '',
  })
  phoneNumber: string;

  @Prop({ required: false })
  passwordHash?: string;

  @Prop({
    unique: true,
    sparse: true,
    index: true,
  })
  googleId?: string;

  @Prop({
    unique: true,
    sparse: true,
    index: true,
  })
  facebookId?: string;

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
      placeId: { type: String, trim: true },
      description: { type: String, trim: true },
      mainText: { type: String, trim: true },
      secondaryText: { type: String, trim: true },
    },
    default: null,
    _id: false,
  })
  address?: {
    placeId?: string;
    description?: string;
    mainText?: string;
    secondaryText?: string;
  } | null;

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

  @Prop({
    default: 0,
  })
  failedAttempts: number;

  @Prop({
    default: false,
  })
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

  @Prop({
    default: 0,
  })
  currentStreak: number;

  @Prop({
    default: 0,
  })
  longestStreak: number;

  @Prop({
    type: Date,
    default: null,
  })
  lastTaskCompletedDate?: Date;

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
