import { HttpStatus } from '@nestjs/common';
import { AppError } from './app-error';

export class NotFoundError extends AppError {
  constructor(
    message: string = 'Resource not found',
    errorCode: string = 'NOT_FOUND',
  ) {
    super(message, HttpStatus.NOT_FOUND, errorCode);
  }
}
