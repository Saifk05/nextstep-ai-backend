import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteTaskDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
