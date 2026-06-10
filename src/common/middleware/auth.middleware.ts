import { Request, Response, NextFunction } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

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
  constructor(private readonly jwtService: JwtService) {}

  use(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthenticatedError(MESSAGES.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthenticatedError(MESSAGES.UNAUTHORIZED);
    }

    try {
      const decoded = this.jwtService.verify(token);

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tokenVersion: decoded.tokenVersion,
      };

      next();
    } catch (error) {
      throw new UnauthenticatedError(MESSAGES.INVALID_TOKEN);
    }
  }
}