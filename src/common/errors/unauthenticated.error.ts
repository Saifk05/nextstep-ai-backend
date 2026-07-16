import { HttpStatus } from '@nestjs/common';
import { AppError } from './app-error';

export class UnauthenticatedError extends AppError {
  constructor(
    message: string = 'Unauthorized',
    errorCode: string = 'UNAUTHORIZED',
  ) {
    super(message, HttpStatus.UNAUTHORIZED, errorCode);
  }
}
