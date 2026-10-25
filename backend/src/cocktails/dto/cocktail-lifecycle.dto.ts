import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CocktailLifecycleDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedContentVersion?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedOrganizationVersion?: number | null;
}

export class ListTrashDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
