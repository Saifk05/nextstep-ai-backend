import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { MESSAGES } from '../../common/constants';
import {
  BadRequestError,
  UnauthenticatedError,
} from '../../common/errors';
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

    const updatedUser = await this.userService.updateProfile(
      userId,
      body,
    );

    if (!updatedUser) {
      throw new BadRequestError(MESSAGES.USER_NOT_FOUND);
    }

    return res.status(200).json({
      success: true,
      message: MESSAGES.USER_UPDATED_SUCCESSFULLY,
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

    const suggestions =
      await this.userService.getAddressSuggestions(query);

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

    const updatedUser = await this.userService.updateAddress(
      userId,
      body,
    );

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