import { HttpStatus } from '@nestjs/common';
import { AppError } from './app-error';

export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    errorCode: string = 'VALIDATION_ERROR',
  ) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, errorCode);
  }
}