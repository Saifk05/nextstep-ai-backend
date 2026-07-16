import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';

import jwtConfig from '../../config/jwt.config';

import { MESSAGES } from '../../common/constants';
import {
  BadRequestError,
  DuplicateRecordError,
  InternalServerError,
  UnauthenticatedError,
} from '../../common/errors';

import { FirebaseProvider } from '../integrations/providers/firebase/firebase.provider';
import { UserStatus } from '../user/user.model';
import { UserService } from '../user/user.service';

interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LogoutRequest {
  userId: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

interface SocialLoginRequest {
  provider: 'GOOGLE' | 'FACEBOOK';
  idToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly firebaseProvider: FirebaseProvider,
  ) {}

  async register(request: RegisterRequest) {
    try {
      const { firstName, lastName, email, phoneNumber, password } = request;

      if (!firstName || !lastName || !email || !phoneNumber || !password) {
        throw new BadRequestError(MESSAGES.BAD_REQUEST);
      }

      const normalizedEmail = email.toLowerCase().trim();

      const existingEmail = await this.userService.findOne({
        email: normalizedEmail,
      });

      if (existingEmail) {
        throw new DuplicateRecordError(MESSAGES.EMAIL_ALREADY_EXISTS);
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await this.userService.createUser({
        firstName,
        lastName,
        email: normalizedEmail,
        phoneNumber: phoneNumber.trim(),
        passwordHash,
      });

      return {
        message: MESSAGES.USER_CREATED_SUCCESSFULLY,
        data: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          status: user.status,
        },
      };
    } catch (error) {
      this.logger.error(
        `Register failed for email: ${request?.email || 'unknown'}`,
        error instanceof Error ? error.stack : JSON.stringify(error),
      );

      if (
        error instanceof BadRequestError ||
        error instanceof DuplicateRecordError
      ) {
        throw error;
      }

      throw new InternalServerError(MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async login(request: LoginRequest) {
    try {
      const { email, password } = request;

      if (!email || !password) {
        throw new BadRequestError(MESSAGES.BAD_REQUEST);
      }

      const normalizedEmail = email.toLowerCase().trim();

      const user = await this.userService.findOne({
        email: normalizedEmail,
      });

      if (!user || !user.passwordHash) {
        throw new UnauthenticatedError(MESSAGES.INVALID_CREDENTIALS);
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        throw new UnauthenticatedError(MESSAGES.INVALID_CREDENTIALS);
      }

      return this.issueTokens(user);
    } catch (error) {
      this.logger.error(
        `Login failed for email: ${request?.email || 'unknown'}`,
        error instanceof Error ? error.stack : JSON.stringify(error),
      );

      if (
        error instanceof BadRequestError ||
        error instanceof UnauthenticatedError
      ) {
        throw error;
      }

      throw new InternalServerError(MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async socialLogin(request: SocialLoginRequest) {
    try {
      const { provider, idToken } = request;

      if (!provider || !idToken) {
        throw new BadRequestError(MESSAGES.BAD_REQUEST);
      }

      if (!['GOOGLE', 'FACEBOOK'].includes(provider)) {
        throw new BadRequestError('Invalid social login provider');
      }

      const decodedToken = await this.firebaseProvider.verifyIdToken(idToken);

      const email = decodedToken.email?.toLowerCase().trim();

      if (!email) {
        throw new UnauthenticatedError('Email not found from social account');
      }

      const providerId = decodedToken.uid;

      let user = await this.userService.findOne({
        email,
      });

      if (!user) {
        const displayName =
          decodedToken.name ||
          decodedToken.email?.split('@')[0] ||
          'NextStep User';

        const [firstName, ...lastNameParts] = displayName.split(' ');

        user = await this.userService.createUser({
          firstName: firstName || 'NextStep',
          lastName: lastNameParts.join(' ') || 'User',
          email,
          phoneNumber: decodedToken.phone_number || undefined,
          ...(provider === 'GOOGLE'
            ? { googleId: providerId }
            : { facebookId: providerId }),
        });

        if (decodedToken.picture) {
          const updatedUser = await this.userService.updateUser(
            user._id.toString(),
            {
              profilePicture: decodedToken.picture,
            },
          );

          if (updatedUser) {
            user = updatedUser;
          }
        }
      } else {
        const update: any = {};

        if (provider === 'GOOGLE' && !user.googleId) {
          update.googleId = providerId;
        }

        if (provider === 'FACEBOOK' && !user.facebookId) {
          update.facebookId = providerId;
        }

        if (decodedToken.picture && !user.profilePicture) {
          update.profilePicture = decodedToken.picture;
        }

        if (Object.keys(update).length) {
          const updatedUser = await this.userService.updateUser(
            user._id.toString(),
            update,
          );

          if (updatedUser) {
            user = updatedUser;
          }
        }
      }

      return this.issueTokens(user);
    } catch (error) {
      this.logger.error(
        `Social login failed for provider: ${request?.provider || 'unknown'}`,
        error instanceof Error ? error.stack : JSON.stringify(error),
      );

      console.error('Social login actual error:', error);

      if (
        error instanceof BadRequestError ||
        error instanceof UnauthenticatedError
      ) {
        throw error;
      }

      throw new InternalServerError(MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async logout(request: LogoutRequest) {
    try {
      const { userId } = request;

      if (!userId) {
        throw new BadRequestError(MESSAGES.BAD_REQUEST);
      }

      await this.userService.updateUser(userId, {
        accessToken: null,
        refreshToken: null,
        status: UserStatus.OFFLINE,
      });

      return {
        message: MESSAGES.LOGOUT_SUCCESSFUL,
        data: {
          userId,
          status: UserStatus.OFFLINE,
        },
      };
    } catch (error) {
      this.logger.error(
        `Logout failed for user: ${request?.userId || 'unknown'}`,
        error instanceof Error ? error.stack : JSON.stringify(error),
      );

      if (error instanceof BadRequestError) {
        throw error;
      }

      throw new InternalServerError(MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async refreshToken(request: RefreshTokenRequest) {
    try {
      const { refreshToken } = request;

      if (!refreshToken) {
        throw new BadRequestError(MESSAGES.BAD_REQUEST);
      }

      let decoded: any;

      try {
        decoded = await this.jwtService.verifyAsync(refreshToken, {
          secret: jwtConfig().jwtRefreshSecret,
        });
      } catch {
        throw new UnauthenticatedError(MESSAGES.INVALID_TOKEN);
      }

      const user = await this.userService.findOne({
        _id: decoded.sub,
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthenticatedError(MESSAGES.INVALID_TOKEN);
      }

      return this.issueTokens(user);
    } catch (error) {
      this.logger.error(
        'Refresh token failed',
        error instanceof Error ? error.stack : JSON.stringify(error),
      );

      if (
        error instanceof BadRequestError ||
        error instanceof UnauthenticatedError
      ) {
        throw error;
      }

      throw new InternalServerError(MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  private async issueTokens(user: any) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: jwtConfig().jwtSecret,
      expiresIn: jwtConfig().jwtExpiresIn as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: jwtConfig().jwtRefreshSecret,
      expiresIn: jwtConfig().jwtRefreshExpiresIn as any,
    });

    const updatedUser = await this.userService.updateUser(user._id.toString(), {
      accessToken,
      refreshToken,
      status: UserStatus.ONLINE,
      lastLoginAt: new Date(),
      failedAttempts: 0,
    });

    return {
      message: MESSAGES.LOGIN_SUCCESSFUL,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber || '',
          profilePicture: user.profilePicture || null,
          status: updatedUser?.status || UserStatus.ONLINE,
        },
        accessToken,
        refreshToken,
      },
    };
  }
}
