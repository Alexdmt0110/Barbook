import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';

interface TransformValue {
  value: unknown;
}

function trimStringArray(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item: unknown) =>
    typeof item === 'string' ? item.trim() : item,
  );
}

export class UpdateCocktailOrganizationDto {
  @ValidateIf(
    (object: UpdateCocktailOrganizationDto) => object.folderId !== null,
  )
  @IsUUID()
  folderId!: string | null;

  @Transform(({ value }: TransformValue) => trimStringArray(value))
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({
    each: true,
  })
  @Length(1, 40, {
    each: true,
  })
  tagNames!: string[];
}
