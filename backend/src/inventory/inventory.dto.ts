import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
  ValidateBy,
  ValidationArguments,
} from 'class-validator';
import { WorkspaceVersionDto } from '../workspaces/workspace.dto';
export { BrowseWorkspacesDto as BrowseInventoryDto } from '../workspaces/workspace.dto';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class StockSettingsDto extends WorkspaceVersionDto {
  @IsInt() @Min(0) @Max(2147483647) threshold!: number;
  @IsInt()
  @Min(0)
  @Max(2147483647)
  @ValidateBy({
    name: 'stockTargetAtLeastThreshold',
    validator: {
      validate: (value: unknown, args?: ValidationArguments) => {
        const object = args?.object as { threshold?: unknown } | undefined;
        const threshold = object?.threshold;
        return (
          typeof value === 'number' &&
          typeof threshold === 'number' &&
          value >= threshold
        );
      },
      defaultMessage: () =>
        'Stock target must be at least its alert threshold.',
    },
  })
  target!: number;
}
export class CreateStockProductDto extends StockSettingsDto {
  @Transform(trim) @IsString() @Length(1, 80) name!: string;
  @Transform(trim) @IsString() @Length(1, 120) packaging!: string;
  @IsInt() @Min(0) @Max(2147483647) initialQuantity!: number;
  @IsUUID('4') requestId!: string;
}
export class UpdateStockSettingsDto extends StockSettingsDto {
  @ValidateIf((_object, value: unknown) => value != null)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedProductVersion?: number | null;
}
export class CreateStockMovementDto extends WorkspaceVersionDto {
  @IsIn(['ADD', 'REMOVE', 'SET']) kind!: 'ADD' | 'REMOVE' | 'SET';
  @IsInt() @Min(0) @Max(2147483647) amount!: number;
  @Transform(trim) @IsString() @Length(1, 240) reason!: string;
  @IsUUID('4') requestId!: string;
  @ValidateIf((_object, value: unknown) => value != null)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedProductVersion?: number | null;
}
