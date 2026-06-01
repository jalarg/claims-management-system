import {
  Claim,
  ClaimStatus,
  DamageManagementNotAllowedError,
  DamageNotFoundError,
  DamageSeverity,
  DomainError,
  FinishClaimPolicyViolationError,
  InvalidClaimStatusTransitionError,
  InvalidDamagePriceError,
  InvalidDamageScoreError,
} from './index';
import type { ClaimProperties, ClaimStatusValue, DamageProperties } from './index';

const baseClaim = {
  id: 'claim-1',
  title: 'Front bumper claim',
  description: 'Customer reported vehicle front bumper damage after a parking incident.',
} satisfies Parameters<typeof Claim.create>[0];

const baseDamage = {
  id: 'damage-1',
  part: 'Front bumper',
  severity: DamageSeverity.Mid,
  imageUrl: 'https://example.com/front-bumper.jpg',
  price: 300,
  score: 6,
} satisfies DamageProperties;

const allStatuses: readonly ClaimStatusValue[] = [
  ClaimStatus.Pending,
  ClaimStatus.InReview,
  ClaimStatus.Finished,
  ClaimStatus.Canceled,
];

function createClaim(): Claim {
  return Claim.create(baseClaim);
}

function createClaimFromProperties(properties: Partial<ClaimProperties>): Claim {
  return Claim.fromProperties({
    ...baseClaim,
    status: ClaimStatus.Pending,
    damages: [],
    ...properties,
  });
}

describe('Claim domain', () => {
  it('starts a new claim as PENDING with a zero total', () => {
    const claim = createClaim();

    expect(claim.status).toBe(ClaimStatus.Pending);
    expect(claim.totalAmount).toBe(0);
    expect(claim.damages).toEqual([]);
  });

  it('exposes claim details and immutable damage details', () => {
    const claim = createClaim();
    claim.addDamage(baseDamage);

    const [damage] = claim.damages;

    expect(claim.id).toBe(baseClaim.id);
    expect(claim.title).toBe(baseClaim.title);
    expect(claim.description).toBe(baseClaim.description);
    expect(damage.id).toBe(baseDamage.id);
    expect(damage.part).toBe(baseDamage.part);
    expect(damage.severity).toBe(baseDamage.severity);
    expect(damage.imageUrl).toBe(baseDamage.imageUrl);
    expect(damage.price).toBe(baseDamage.price);
    expect(damage.score).toBe(baseDamage.score);
  });

  it('allows PENDING to transition to IN_REVIEW', () => {
    const claim = createClaim();

    claim.transitionTo(ClaimStatus.InReview);

    expect(claim.status).toBe(ClaimStatus.InReview);
  });

  it('allows PENDING to transition to CANCELED', () => {
    const claim = createClaim();

    claim.transitionTo(ClaimStatus.Canceled);

    expect(claim.status).toBe(ClaimStatus.Canceled);
  });

  it('allows IN_REVIEW to transition to FINISHED when policies pass', () => {
    const claim = createClaim();

    claim.transitionTo(ClaimStatus.InReview);
    claim.transitionTo(ClaimStatus.Finished);

    expect(claim.status).toBe(ClaimStatus.Finished);
  });

  it('rejects direct PENDING to FINISHED transitions', () => {
    const claim = createClaim();

    expect(() => claim.transitionTo(ClaimStatus.Finished)).toThrow(InvalidClaimStatusTransitionError);
  });

  it('rejects IN_REVIEW to CANCELED transitions', () => {
    const claim = createClaimFromProperties({ status: ClaimStatus.InReview });

    expect(() => claim.transitionTo(ClaimStatus.Canceled)).toThrow(InvalidClaimStatusTransitionError);
  });

  for (const terminalStatus of [ClaimStatus.Finished, ClaimStatus.Canceled] as const) {
    for (const nextStatus of allStatuses) {
      it(`rejects ${terminalStatus} to ${nextStatus} because ${terminalStatus} is terminal`, () => {
        const claim = createClaimFromProperties({ status: terminalStatus });

        expect(() => claim.transitionTo(nextStatus)).toThrow(InvalidClaimStatusTransitionError);
      });
    }
  }

  it('rejects finishing a high-severity claim when description length is exactly 100 characters', () => {
    const claim = createClaimFromProperties({
      description: 'a'.repeat(100),
      status: ClaimStatus.InReview,
      damages: [
        {
          ...baseDamage,
          severity: DamageSeverity.High,
        },
      ],
    });

    expect(() => claim.transitionTo(ClaimStatus.Finished)).toThrow(FinishClaimPolicyViolationError);
  });

  it('allows finishing a high-severity claim when description length is 101 characters', () => {
    const claim = createClaimFromProperties({
      description: 'a'.repeat(101),
      status: ClaimStatus.InReview,
      damages: [
        {
          ...baseDamage,
          severity: DamageSeverity.High,
        },
      ],
    });

    claim.transitionTo(ClaimStatus.Finished);

    expect(claim.status).toBe(ClaimStatus.Finished);
  });

  it('calculates totalAmount from damage prices', () => {
    const claim = createClaim();

    claim.addDamage({ ...baseDamage, price: 125.5 });
    claim.addDamage({ ...baseDamage, id: 'damage-2', part: 'Door', price: 224.5 });

    expect(claim.totalAmount).toBe(350);
  });

  it('recalculates totalAmount after adding, editing, and deleting damages', () => {
    const claim = createClaim();

    claim.addDamage({ ...baseDamage, price: 100 });
    expect(claim.totalAmount).toBe(100);

    claim.addDamage({ ...baseDamage, id: 'damage-2', part: 'Door', price: 50 });
    expect(claim.totalAmount).toBe(150);

    claim.updateDamage('damage-2', { price: 75 });
    expect(claim.totalAmount).toBe(175);

    claim.deleteDamage('damage-1');
    expect(claim.totalAmount).toBe(75);
  });

  it('rejects updating an unknown damage id', () => {
    const claim = createClaim();
    claim.addDamage(baseDamage);

    expect(() => claim.updateDamage('missing-damage', { price: 400 })).toThrow(DamageNotFoundError);
  });

  it('rejects deleting an unknown damage id', () => {
    const claim = createClaim();
    claim.addDamage(baseDamage);

    expect(() => claim.deleteDamage('missing-damage')).toThrow(DamageNotFoundError);
  });

  it('returns domain errors with specific names and messages', () => {
    const error = new DamageNotFoundError('missing-damage');

    expect(error).toBeInstanceOf(DomainError);
    expect(error.name).toBe('DamageNotFoundError');
    expect(error.message).toBe('Damage not found: missing-damage.');
  });

  const nonPendingStatuses: readonly ClaimStatusValue[] = [
    ClaimStatus.InReview,
    ClaimStatus.Finished,
    ClaimStatus.Canceled,
  ];

  for (const status of nonPendingStatuses) {
    it(`rejects adding damages while claim is ${status}`, () => {
      const claim = createClaimFromProperties({ status });

      expect(() => claim.addDamage(baseDamage)).toThrow(DamageManagementNotAllowedError);
    });
  }

  for (const status of nonPendingStatuses) {
    it(`rejects updating damages while claim is ${status}`, () => {
      const claim = createClaimFromProperties({
        status,
        damages: [baseDamage],
      });

      expect(() => claim.updateDamage('damage-1', { price: 400 })).toThrow(DamageManagementNotAllowedError);
    });
  }

  for (const status of nonPendingStatuses) {
    it(`rejects deleting damages while claim is ${status}`, () => {
      const claim = createClaimFromProperties({
        status,
        damages: [baseDamage],
      });

      expect(() => claim.deleteDamage('damage-1')).toThrow(DamageManagementNotAllowedError);
    });
  }

  for (const price of [0, -1, Number.NaN]) {
    it(`rejects invalid damage price ${price}`, () => {
      const claim = createClaim();

      expect(() => claim.addDamage({ ...baseDamage, price })).toThrow(InvalidDamagePriceError);
    });
  }

  for (const score of [0, 11, 1.5]) {
    it(`rejects invalid damage score ${score}`, () => {
      const claim = createClaim();

      expect(() => claim.addDamage({ ...baseDamage, score })).toThrow(InvalidDamageScoreError);
    });
  }

  it('rejects damage updates with invalid prices', () => {
    const claim = createClaim();
    claim.addDamage(baseDamage);

    expect(() => claim.updateDamage('damage-1', { price: 0 })).toThrow(InvalidDamagePriceError);
  });

  it('rejects damage updates with invalid scores', () => {
    const claim = createClaim();
    claim.addDamage(baseDamage);

    expect(() => claim.updateDamage('damage-1', { score: 1.5 })).toThrow(InvalidDamageScoreError);
  });

  it('serializes domain state without exposing mutable damage references', () => {
    const claim = createClaim();
    claim.addDamage(baseDamage);

    const claimProperties = claim.toProperties();
    claimProperties.damages[0].price = 1;

    expect(claim.totalAmount).toBe(300);
  });
});
