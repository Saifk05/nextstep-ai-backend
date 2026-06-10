import { HttpStatus } from '@nestjs/common';
import { AppError } from './app-error';

export class ForbiddenError extends AppError {
  constructor(
    message: string = 'Forbidden',
    errorCode: string = 'FORBIDDEN',
  ) {
    super(message, HttpStatus.FORBIDDEN, errorCode);
  }
}