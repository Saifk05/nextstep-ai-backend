import { Request, Response, NextFunction } from 'express';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import jwtConfig from '../../config/jwt.config';

import { UnauthenticatedError } from '../errors';
import { MESSAGES } from '../constants';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    role?: string;
    tokenVersion?: number;
  };
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(private readonly jwtService: JwtService) {}

  use(req: AuthRequest, res: Response, next: NextFunction) {
    // console.log('================================');
    // console.log('AUTH MIDDLEWARE HIT');
    // console.log('URL:', req.originalUrl);
    // console.log('METHOD:', req.method);
    // console.log('AUTH HEADER:', req.headers.authorization);
    // console.log('================================');

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('Missing or invalid Authorization header');
      throw new UnauthenticatedError(MESSAGES.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];
    this.logger.debug('Authorization token received');
    // console.log('TOKEN:', token);

    if (!token) {
      this.logger.warn('Bearer token missing');
      throw new UnauthenticatedError(MESSAGES.UNAUTHORIZED);
    }

    try {
      const decoded = this.jwtService.verify(token, {
        secret: jwtConfig().jwtSecret,
      }) as {
        sub?: string;
        userId?: string;
        email?: string;
        role?: string;
        tokenVersion?: number;
      };

      // console.log('================================');
      // console.log('DECODED TOKEN:', decoded);
      // console.log('================================');

      const userId = decoded.sub || decoded.userId;

      // console.log('USER ID FROM TOKEN:', userId);

      if (!userId) {
        this.logger.warn('Token decoded but user id is missing');
        throw new UnauthenticatedError(MESSAGES.INVALID_TOKEN);
      }

      req.user = {
        userId,
        email: decoded.email,
        role: decoded.role,
        tokenVersion: decoded.tokenVersion,
      };

      // console.log('================================');
      // console.log('REQ.USER:', req.user);
      // console.log('================================');

      this.logger.log(`Authenticated userId: ${userId}`);

      next();
    } catch (error) {
      // console.log('================================');
      // console.log('JWT VERIFY ERROR:', error);
      // console.log('================================');

      this.logger.error('JWT verification failed', error);

      throw new UnauthenticatedError(MESSAGES.INVALID_TOKEN);
    }
  }
}