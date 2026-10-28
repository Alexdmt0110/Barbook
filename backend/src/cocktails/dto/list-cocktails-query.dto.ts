import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CocktailType, RecipeMethod } from '../../generated/prisma/client';

interface TransformValue {
  value: unknown;
}

/**
 * Normalise une chaîne facultative et transforme une chaîne vide
 * en absence de valeur.
 */
function trimOptionalString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

export class ListCocktailsQueryDto {
  @IsOptional()
  @Transform(({ value }: TransformValue) => trimOptionalString(value))
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(CocktailType)
  type?: CocktailType;

  @IsOptional()
  @IsEnum(RecipeMethod)
  method?: RecipeMethod;

  @IsOptional()
  @Transform(({ value }: TransformValue) => trimOptionalString(value))
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @Transform(({ value }: TransformValue) => trimOptionalString(value))
  @IsUUID()
  tagId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
