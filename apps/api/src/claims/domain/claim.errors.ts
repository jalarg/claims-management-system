import type { ClaimStatus } from './claim-status';

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidClaimStatusTransitionError extends DomainError {
  constructor(from: ClaimStatus, to: ClaimStatus) {
    super(`Cannot transition claim from ${from} to ${to}.`);
  }
}

export class FinishClaimPolicyViolationError extends DomainError {
  constructor() {
    super('Claims with high severity damages require a description longer than 100 characters before finishing.');
  }
}

export class DamageManagementNotAllowedError extends DomainError {
  constructor(status: ClaimStatus) {
    super(`Damages can only be managed while the claim is PENDING. Current status: ${status}.`);
  }
}

export class InvalidDamagePriceError extends DomainError {
  constructor(price: number) {
    super(`Damage price must be greater than 0. Received: ${price}.`);
  }
}

export class InvalidDamageScoreError extends DomainError {
  constructor(score: number) {
    super(`Damage score must be an integer from 1 to 10. Received: ${score}.`);
  }
}

export class DamageNotFoundError extends DomainError {
  constructor(damageId: string) {
    super(`Damage not found: ${damageId}.`);
  }
}
