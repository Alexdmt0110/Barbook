import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

interface TransformValue {
  value: unknown;
}

/**
 * Valide la recherche reçue à la frontière HTTP avant son passage au service.
 */
export class SearchIngredientsQueryDto {
  @IsOptional()
  @Transform(({ value }: TransformValue) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  query?: string;
}
