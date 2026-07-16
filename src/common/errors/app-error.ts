import { HttpException, HttpStatus } from '@nestjs/common';

export class AppError extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: string = 'INTERNAL_SERVER_ERROR',
  ) {
    super(
      {
        success: false,
        message,
        errorCode,
        statusCode,
      },
      statusCode,
    );
  }
}
