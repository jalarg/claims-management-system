import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { AtLeastOneProperty } from '../../common/validation/at-least-one-property.validator';

export class UpdateClaimDto {
  @AtLeastOneProperty(['title', 'description'])
  private readonly atLeastOneField?: never;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly description?: string;
}
