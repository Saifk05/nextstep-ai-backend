import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument, UserStatus } from './user.model';

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async createUser(request: CreateUserRequest): Promise<UserDocument> {
    const user = new this.userModel({
      firstName: request.firstName.trim(),
      lastName: request.lastName.trim(),
      email: request.email.toLowerCase().trim(),
      phoneNumber: request.phoneNumber.trim(),
      passwordHash: request.passwordHash,
      status: UserStatus.OFFLINE,
    });

    return user.save();
  }

  async findOne(filter: any): Promise<UserDocument | null> {
    return this.userModel.findOne(filter).exec();
  }

  async findById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).exec();
  }

  async updateUser(
    userId: string,
    update: any,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, update, {
        returnDocument: 'after',
      })
      .exec();
  }

  async updateOne(
    filter: any,
    update: any,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(filter, update, {
        returnDocument: 'after',
      })
      .exec();
  }

  async updateById(
    userId: string,
    update: any,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, update, {
        returnDocument: 'after',
      })
      .exec();
  }

  async deleteById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndDelete(userId).exec();
  }
}