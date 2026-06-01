import { FinishClaimPolicyViolationError } from './claim.errors';
import type { Damage } from './damage';
import { DamageSeverity } from './damage-severity';

export interface FinishClaimPolicyInput {
  description: string;
  damages: readonly Damage[];
}

export class FinishClaimPolicy {
  private static readonly minimumDescriptionLengthForHighSeverity = 100;

  static assertCanFinish(claim: FinishClaimPolicyInput): void {
    const hasHighSeverityDamage = claim.damages.some((damage) => damage.severity === DamageSeverity.High);

    if (hasHighSeverityDamage && claim.description.length <= FinishClaimPolicy.minimumDescriptionLengthForHighSeverity) {
      throw new FinishClaimPolicyViolationError();
    }
  }
}
