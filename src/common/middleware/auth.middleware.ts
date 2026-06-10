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
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('Missing or invalid Authorization header');
      throw new UnauthenticatedError(MESSAGES.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];

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

      const userId = decoded.sub || decoded.userId;

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

      this.logger.log(`Authenticated userId: ${userId}`);

      next();
    } catch (error) {
      this.logger.error('JWT verification failed', error);
      throw new UnauthenticatedError(MESSAGES.INVALID_TOKEN);
    }
  }
}