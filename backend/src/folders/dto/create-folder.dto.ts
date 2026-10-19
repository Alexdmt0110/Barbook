import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

interface TransformValue {
  value: unknown;
}

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateFolderDto {
  @Transform(({ value }: TransformValue) => trimString(value))
  @IsString()
  @Length(1, 80)
  name!: string;
}
