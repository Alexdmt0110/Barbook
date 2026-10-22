import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreateFolderDto } from './create-folder.dto';

export class BrowseFoldersDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}

export class RenameFolderDto extends CreateFolderDto {
  @IsInt()
  @Min(0)
  expectedVersion!: number;
}

export class DeleteFolderQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)
      ? Number(value)
      : value,
  )
  @ValidateIf((_object, value: unknown) => value != null)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedVersion?: number | null;

  @ValidateIf((_object, value: unknown) => value != null)
  @Matches(/^[a-f0-9]{64}$/)
  expectedMembershipToken?: string | null;
}

export class RecipeVersionQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)
      ? Number(value)
      : value,
  )
  @ValidateIf((_object, value: unknown) => value != null)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedVersion?: number | null;
}

export class ExpectedRecipeVersionDto {
  @IsUUID()
  cocktailId!: string;

  @ValidateIf((_object, value: unknown) => value != null)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedVersion?: number | null;
}

export class AddFolderCocktailsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  cocktailIds!: string[];

  @ValidateIf((_object, value: unknown) => value != null)
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ExpectedRecipeVersionDto)
  expectedVersions?: ExpectedRecipeVersionDto[] | null;
}
