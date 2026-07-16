import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

import { BadRequestError } from '../../common/errors';
import { User, UserDocument, UserStatus } from './user.model';

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  passwordHash?: string;
  googleId?: string;
  facebookId?: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createUser(request: CreateUserRequest): Promise<UserDocument> {
    const user = new this.userModel({
      firstName: request.firstName.trim(),
      lastName: request.lastName.trim(),
      email: request.email.toLowerCase().trim(),
      phoneNumber: request.phoneNumber?.trim() || '',
      passwordHash: request.passwordHash,
      googleId: request.googleId,
      facebookId: request.facebookId,
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

  async updateUser(userId: string, update: any): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, update, {
        returnDocument: 'after',
      })
      .exec();
  }

  async updateOne(filter: any, update: any): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(filter, update, {
        returnDocument: 'after',
      })
      .exec();
  }

  async updateById(userId: string, update: any): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, update, {
        returnDocument: 'after',
      })
      .exec();
  }

  async deleteById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndDelete(userId).exec();
  }

  toProfileResponse(user: UserDocument) {
    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture || null,
      dateOfBirth: user.dateOfBirth || null,
      gender: user.gender || null,
      address: user.address || null,
      status: user.status,
      onboardingStatus: user.onboardingStatus,
      lastLoginAt: user.lastLoginAt || null,
    };
  }

  async updateProfile(userId: string, request: any) {
    const update: any = {};

    if (request.firstName !== undefined) {
      update.firstName = String(request.firstName).trim();
    }

    if (request.lastName !== undefined) {
      update.lastName = String(request.lastName).trim();
    }

    if (request.phoneNumber !== undefined) {
      update.phoneNumber = String(request.phoneNumber).trim();
    }

    if (request.profilePicture !== undefined) {
      update.profilePicture = request.profilePicture;
    }

    if (request.dateOfBirth !== undefined) {
      update.dateOfBirth = request.dateOfBirth
        ? new Date(request.dateOfBirth)
        : null;
    }

    if (request.gender !== undefined) {
      update.gender = request.gender;
    }

    if (request.address !== undefined) {
      update.address = request.address;
    }

    const user = await this.updateById(userId, update);

    if (!user) {
      return null;
    }

    return this.toProfileResponse(user);
  }

  async getAddressSuggestions(query: string) {
    if (!query || query.trim().length < 3) {
      throw new BadRequestError('Search query must be at least 3 characters');
    }

    const apiKey = process.env.OLAMAPS_KEY;
    const baseUrl = process.env.OLA_MAPS_API;

    if (!apiKey || !baseUrl) {
      throw new BadRequestError('Ola Maps configuration missing');
    }

    // const url = `${baseUrl}?input=${encodeURIComponent(
    //   query.trim(),
    // )}&api_key=${apiKey}`;
    const url = `${baseUrl}/places/v1/autocomplete?input=${encodeURIComponent(
      query.trim(),
    )}&api_key=${apiKey}`;
    // const response = await fetch(url);

    // if (!response.ok) {
    //   throw new BadRequestError('Unable to fetch address suggestions');
    // }

    // const result = await response.json();

    console.log('OLA MAPS URL:', url);

    const response = await fetch(url);

    console.log('OLA MAPS STATUS:', response.status);

    const result = await response.json();

    console.log('OLA MAPS RESPONSE:', JSON.stringify(result));

    if (!response.ok) {
      throw new BadRequestError('Unable to fetch address suggestions');
    }

    const predictions = result?.predictions || [];

    return predictions.map((item: any) => ({
      placeId: item.place_id,
      description: item.description,
      mainText: item.structured_formatting?.main_text || item.description,
      secondaryText: item.structured_formatting?.secondary_text || '',
    }));
  }

  async updateAddress(userId: string, address: any) {
    if (!address?.placeId || !address?.description) {
      throw new BadRequestError('Invalid address selected');
    }

    const user = await this.updateById(userId, {
      address: {
        placeId: address.placeId,
        description: address.description,
        mainText: address.mainText || address.description,
        secondaryText: address.secondaryText || '',
      },
    });

    if (!user) {
      return null;
    }

    return this.toProfileResponse(user);
  }

  async updateProfilePicture(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Profile picture file is required');
    }

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const uploadedImage = await this.cloudinaryService.uploadProfileImage(file);

    user.profilePicture = uploadedImage.secure_url;

    await user.save();

    return this.toProfileResponse(user);
  }
}
