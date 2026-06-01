import type { ClaimResponse } from '../claim-response';
import type { ClaimStatusValue } from '../domain';

export const CLAIMS_REPOSITORY = Symbol('CLAIMS_REPOSITORY');

export interface CreateStoredClaim {
  title: string;
  description: string;
}

export type StoredClaim = ClaimResponse;

export interface ClaimsRepository {
  create(claim: CreateStoredClaim): Promise<StoredClaim>;
  findAll(status?: ClaimStatusValue): Promise<StoredClaim[]>;
  findById(id: string): Promise<StoredClaim | null>;
  save(claim: StoredClaim): Promise<StoredClaim | null>;
}
