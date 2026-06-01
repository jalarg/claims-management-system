import type { ClaimStatusValue, DamageProperties } from './domain';

export interface ClaimResponse {
  id: string;
  title: string;
  description: string;
  status: ClaimStatusValue;
  totalAmount: number;
  damages: DamageProperties[];
  createdAt: string;
  updatedAt: string;
}

export type ClaimSummaryResponse = Omit<ClaimResponse, 'damages'>;

export function toClaimSummaryResponse(claim: ClaimResponse): ClaimSummaryResponse {
  const { damages: _damages, ...summary } = claim;

  return summary;
}
