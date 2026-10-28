import { Type } from 'class-transformer';
import { IsEnum, IsInt, Max, Min, ValidateIf } from 'class-validator';
import {
  CreateCocktailDto,
  CreateCocktailIngredientDto,
} from './create-cocktail.dto';

export enum RecipeAbvMode {
  INHERIT = 'INHERIT',
  OVERRIDE = 'OVERRIDE',
  UNKNOWN = 'UNKNOWN',
}

export class EditCocktailIngredientDto extends CreateCocktailIngredientDto {
  @IsEnum(RecipeAbvMode)
  abvMode!: RecipeAbvMode;
}

export class ReplaceCocktailContentDto extends CreateCocktailDto {
  @ValidateIf((_object, value: unknown) => value != null)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedContentVersion?: number | null;

  @Type(() => EditCocktailIngredientDto)
  declare ingredients: EditCocktailIngredientDto[];
}
