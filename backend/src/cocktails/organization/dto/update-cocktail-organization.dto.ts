import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Min,
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
    (object: UpdateCocktailOrganizationDto) =>
      object.folderId !== undefined && object.folderId !== null,
  )
  @IsUUID()
  folderId?: string | null;

  @ValidateIf(
    (object: UpdateCocktailOrganizationDto) => object.folderIds !== undefined,
  )
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('all', { each: true })
  folderIds?: string[];

  @ValidateIf(
    (object: UpdateCocktailOrganizationDto) =>
      object.expectedVersion !== undefined,
  )
  @IsInt()
  @Min(0)
  expectedVersion?: number;

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
