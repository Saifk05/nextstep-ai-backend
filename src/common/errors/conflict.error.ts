import { HttpStatus } from '@nestjs/common';
import { AppError } from './app-error';

export class ConflictError extends AppError {
  constructor(
    message: string = 'Conflict',
    errorCode: string = 'CONFLICT',
  ) {
    super(message, HttpStatus.CONFLICT, errorCode);
  }
}