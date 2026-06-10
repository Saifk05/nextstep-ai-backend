import { HttpStatus } from '@nestjs/common';
import { AppError } from './app-error';

export class TooManyRequestsError extends AppError {
  constructor(
    message: string = 'Too many requests',
    errorCode: string = 'TOO_MANY_REQUESTS',
  ) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, errorCode);
  }
}