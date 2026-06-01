import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUrl, Max, Min } from 'class-validator';

import { AtLeastOneProperty } from '../../common/validation/at-least-one-property.validator';
import { DamageSeverity } from '../domain';
import type { DamageSeverityValue } from '../domain';

export class UpdateDamageDto {
  @AtLeastOneProperty(['part', 'severity', 'imageUrl', 'price', 'score'])
  private readonly atLeastOneField?: never;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly part?: string;

  @IsOptional()
  @IsIn(Object.values(DamageSeverity))
  readonly severity?: DamageSeverityValue;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  readonly imageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  readonly price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  readonly score?: number;
}
