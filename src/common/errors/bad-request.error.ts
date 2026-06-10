import { HttpStatus } from '@nestjs/common';
import { AppError } from './app-error';

export class BadRequestError extends AppError {
  constructor(
    message: string = 'Bad Request',
    errorCode: string = 'BAD_REQUEST',
  ) {
    super(message, HttpStatus.BAD_REQUEST, errorCode);
  }
}