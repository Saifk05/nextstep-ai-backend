import { ConflictError } from './conflict.error';

export class DuplicateRecordError extends ConflictError {
  constructor(
    message: string = 'Record already exists',
    errorCode: string = 'DUPLICATE_RECORD',
  ) {
    super(message, errorCode);
  }
}
