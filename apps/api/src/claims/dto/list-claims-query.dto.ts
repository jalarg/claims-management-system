import { IsIn, IsOptional } from 'class-validator';

import { ClaimStatus } from '../domain';
import type { ClaimStatusValue } from '../domain';

export class ListClaimsQueryDto {
  @IsOptional()
  @IsIn(Object.values(ClaimStatus))
  readonly status?: ClaimStatusValue;
}
