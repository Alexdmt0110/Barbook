import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { WorkspaceVersionDto } from '../workspaces/workspace.dto';
import { BATCH_UNITS, BatchParameters, BatchUnit } from './batch-calculation';
export class BatchRoundingDto {
  @IsIn(BATCH_UNITS.filter((unit) => unit !== 'TOP_UP')) unit!: Exclude<
    BatchUnit,
    'TOP_UP'
  >;
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) @Max(100000) step!: number;
}
export class BatchParametersDto
  extends WorkspaceVersionDto
  implements BatchParameters
{
  @IsIn(['PORTIONS', 'VOLUME_ML']) mode!: 'PORTIONS' | 'VOLUME_ML';
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) @Max(1000000) target!: number;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(49, { each: true })
  includedPositions!: number[];
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => BatchRoundingDto)
  rounding!: BatchRoundingDto[];
}
export class PreviewRecipeBatchDto extends BatchParametersDto {
  @IsUUID() sourceCocktailId!: string;
  @ValidateIf((_object, value: unknown) => value != null)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedContentVersion?: number | null;
}
export class CreateBatchPlanDto extends PreviewRecipeBatchDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 120)
  name!: string;
  @IsUUID('4') requestId!: string;
}
export class PreviewSavedBatchDto extends BatchParametersDto {
  @ValidateIf((_object, value: unknown) => value != null)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedPlanVersion?: number | null;
}
export class UpdateBatchPlanDto extends PreviewSavedBatchDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 120)
  name!: string;
}
