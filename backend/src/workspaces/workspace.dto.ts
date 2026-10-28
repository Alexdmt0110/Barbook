import { Transform, Type } from 'class-transformer';
import { BarAccent, WorkspaceKind } from '../generated/prisma/client';
import {
  IsEmail,
  IsUUID,
  IsString,
  Length,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class BrowseWorkspacesDto {
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

/** Catalog-only filter; membership-management query contracts stay unchanged. */
export class BrowseWorkspaceCatalogDto extends BrowseWorkspacesDto {
  @IsOptional()
  @IsEnum(WorkspaceKind)
  kind?: WorkspaceKind;
}

export class WorkspaceVersionDto {
  @ValidateIf((_object, value: unknown) => value != null)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedAccessVersion?: number | null;
}

export class AddWorkspaceMemberDto extends WorkspaceVersionDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class CreateBarDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsEnum(BarAccent)
  accentKey!: BarAccent;

  @IsUUID('4')
  creationRequestId!: string;
}
