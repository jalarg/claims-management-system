import { IsIn } from 'class-validator';

import { ClaimStatus } from '../domain';
import type { ClaimStatusValue } from '../domain';

export class UpdateClaimStatusDto {
  @IsIn(Object.values(ClaimStatus))
  readonly status!: ClaimStatusValue;
}
