import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CocktailType,
  MeasurementUnit,
  RecipeMethod,
} from '../../generated/prisma/client';

const MAX_STORED_AMOUNT = 99_999.999;

interface TransformValue {
  value: unknown;
}

/**
 * Supprime les espaces périphériques d'une chaîne sans altérer les autres types.
 */
function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * Normalise une chaîne facultative et transforme une chaîne vide en absence de valeur.
 */
function trimOptionalString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

/**
 * Nettoie individuellement les étapes textuelles d'une recette.
 */
function trimSteps(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((step: unknown) =>
    typeof step === 'string' ? step.trim() : step,
  );
}

export class CreateCocktailIngredientDto {
  @Transform(({ value }: TransformValue) => trimString(value))
  @IsString()
  @Length(1, 120)
  ingredientName!: string;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  @Max(100)
  ingredientDefaultAbv?: number | null;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 3,
  })
  @Min(0.001)
  @Max(MAX_STORED_AMOUNT)
  amount?: number | null;

  @IsEnum(MeasurementUnit)
  unit!: MeasurementUnit;

  @IsOptional()
  @Transform(({ value }: TransformValue) => trimOptionalString(value))
  @IsString()
  @MaxLength(160)
  specification?: string;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  @Max(100)
  abvOverride?: number | null;

  @IsOptional()
  @Transform(({ value }: TransformValue) => trimOptionalString(value))
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateCocktailGarnishDto {
  @Transform(({ value }: TransformValue) => trimString(value))
  @IsString()
  @Length(1, 120)
  ingredientName!: string;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 3,
  })
  @Min(0.001)
  @Max(MAX_STORED_AMOUNT)
  amount?: number | null;

  @IsOptional()
  @IsEnum(MeasurementUnit)
  unit?: MeasurementUnit | null;

  @IsOptional()
  @Transform(({ value }: TransformValue) => trimOptionalString(value))
  @IsString()
  @MaxLength(160)
  specification?: string;

  @Transform(({ value }: TransformValue) => trimString(value))
  @IsString()
  @Length(1, 500)
  usage!: string;
}

export class CreateCocktailDto {
  @Transform(({ value }: TransformValue) => trimString(value))
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsEnum(CocktailType)
  type!: CocktailType;

  @IsOptional()
  @Transform(({ value }: TransformValue) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  family?: string;

  @IsEnum(RecipeMethod)
  method!: RecipeMethod;

  @Transform(({ value }: TransformValue) => trimString(value))
  @IsString()
  @Length(1, 80)
  glass!: string;

  @IsOptional()
  @Transform(({ value }: TransformValue) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  ice?: string;

  @IsOptional()
  @Transform(({ value }: TransformValue) => trimOptionalString(value))
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @Transform(({ value }: TransformValue) => trimOptionalString(value))
  @IsString()
  @MaxLength(120)
  mainAlcoholName?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({
    each: true,
  })
  @Type(() => CreateCocktailIngredientDto)
  ingredients!: CreateCocktailIngredientDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({
    each: true,
  })
  @Type(() => CreateCocktailGarnishDto)
  garnishes?: CreateCocktailGarnishDto[];

  @Transform(({ value }: TransformValue) => trimSteps(value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({
    each: true,
  })
  @Length(1, 500, {
    each: true,
  })
  steps!: string[];
}
