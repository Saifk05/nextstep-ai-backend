import { HttpStatus } from '@nestjs/common';
import { AppError } from './app-error';

export class InternalServerError extends AppError {
  constructor(
    message: string = 'Internal server error',
    errorCode: string = 'INTERNAL_SERVER_ERROR',
  ) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, errorCode);
  }
}
