import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';

import { MESSAGES } from '../../common/constants';
import { BadRequestError, UnauthenticatedError } from '../../common/errors';
import { UserService } from './user.service';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    role?: string;
    tokenVersion?: number;
  };
}

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(@Req() req: AuthRequest, @Res() res: Response) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthenticatedError(MESSAGES.UNAUTHORIZED);
    }

    const user = await this.userService.findById(userId);

    if (!user) {
      throw new BadRequestError(MESSAGES.USER_NOT_FOUND);
    }

    return res.status(200).json({
      success: true,
      message: 'Profile fetched successfully',
      data: this.userService.toProfileResponse(user),
    });
  }

  @Patch('profile')
  async updateProfile(
    @Req() req: AuthRequest,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthenticatedError(MESSAGES.UNAUTHORIZED);
    }

    const updatedUser = await this.userService.updateProfile(userId, body);

    if (!updatedUser) {
      throw new BadRequestError(MESSAGES.USER_NOT_FOUND);
    }

    return res.status(200).json({
      success: true,
      message: MESSAGES.USER_UPDATED_SUCCESSFULLY,
      data: updatedUser,
    });
  }

  @Patch('profile-picture')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Only image files are allowed. Supported formats: jpg, jpeg, png, webp',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async updateProfilePicture(
    @Req() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthenticatedError(MESSAGES.UNAUTHORIZED);
    }

    if (!file) {
      throw new BadRequestException('Profile picture file is required');
    }

    const updatedUser = await this.userService.updateProfilePicture(
      userId,
      file,
    );

    return res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      data: updatedUser,
    });
  }

  @Get('address/suggestions')
  async getAddressSuggestions(
    @Req() req: AuthRequest,
    @Query('query') query: string,
    @Res() res: Response,
  ) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthenticatedError(MESSAGES.UNAUTHORIZED);
    }

    const suggestions = await this.userService.getAddressSuggestions(query);

    return res.status(200).json({
      success: true,
      message: 'Address suggestions fetched successfully',
      data: suggestions,
    });
  }

  @Patch('address')
  async updateAddress(
    @Req() req: AuthRequest,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthenticatedError(MESSAGES.UNAUTHORIZED);
    }

    const updatedUser = await this.userService.updateAddress(userId, body);

    if (!updatedUser) {
      throw new BadRequestError(MESSAGES.USER_NOT_FOUND);
    }

    return res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: updatedUser,
    });
  }
}
