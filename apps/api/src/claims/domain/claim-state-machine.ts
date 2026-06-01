import { InvalidClaimStatusTransitionError } from './claim.errors';
import { ClaimStatus } from './claim-status';
import type { ClaimStatus as ClaimStatusValue } from './claim-status';

const allowedTransitions: Record<ClaimStatusValue, readonly ClaimStatusValue[]> = {
  [ClaimStatus.Pending]: [ClaimStatus.InReview, ClaimStatus.Canceled],
  [ClaimStatus.InReview]: [ClaimStatus.Finished],
  [ClaimStatus.Finished]: [],
  [ClaimStatus.Canceled]: [],
};

export class ClaimStateMachine {
  static canTransition(from: ClaimStatusValue, to: ClaimStatusValue): boolean {
    return allowedTransitions[from].includes(to);
  }

  static assertCanTransition(from: ClaimStatusValue, to: ClaimStatusValue): void {
    if (!ClaimStateMachine.canTransition(from, to)) {
      throw new InvalidClaimStatusTransitionError(from, to);
    }
  }
}
