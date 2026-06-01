import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, IsUrl, Max, Min } from 'class-validator';

import { DamageSeverity } from '../domain';
import type { DamageSeverityValue } from '../domain';

export class CreateDamageDto {
  @IsString()
  @IsNotEmpty()
  readonly part!: string;

  @IsIn(Object.values(DamageSeverity))
  readonly severity!: DamageSeverityValue;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  readonly imageUrl!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  readonly price!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  readonly score!: number;
}
