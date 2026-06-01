import { NotFoundException } from '@nestjs/common';

import { ClaimsService } from './claims.service';
import { ClaimStatus, DamageManagementNotAllowedError, DamageSeverity, InvalidClaimStatusTransitionError } from './domain';
import type { ClaimsRepository, StoredClaim } from './persistence/claims.repository';

const storedClaim = {
  id: '507f1f77bcf86cd799439011',
  title: 'Front bumper claim',
  description: 'Customer reported vehicle front bumper damage after a parking incident.',
  status: ClaimStatus.Pending,
  totalAmount: 0,
  damages: [],
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-01T10:00:00.000Z',
} satisfies StoredClaim;

const damage = {
  id: 'damage-1',
  part: 'Front bumper',
  severity: DamageSeverity.Mid,
  imageUrl: 'https://example.com/front-bumper.jpg',
  price: 300,
  score: 6,
};

function createRepositoryMock(): jest.Mocked<ClaimsRepository> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
}

describe('ClaimsService', () => {
  let repository: jest.Mocked<ClaimsRepository>;
  let service: ClaimsService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new ClaimsService(repository);
    repository.save.mockImplementation(async (claim) => claim);
  });

  it('creates claims as repository-owned pending records', async () => {
    repository.create.mockResolvedValue(storedClaim);

    const result = await service.createClaim({ title: storedClaim.title, description: storedClaim.description });

    expect(result).toBe(storedClaim);
    expect(repository.create).toHaveBeenCalledWith({
      title: storedClaim.title,
      description: storedClaim.description,
    });
  });

  it('lists claims with an optional status filter', async () => {
    repository.findAll.mockResolvedValue([{ ...storedClaim, damages: [damage], totalAmount: 300 }]);

    const result = await service.findClaims(ClaimStatus.Pending);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe(storedClaim.id);
    expect(result[0].totalAmount).toBe(300);
    expect('damages' in result[0]).toBe(false);
    expect(repository.findAll).toHaveBeenCalledWith(ClaimStatus.Pending);
  });

  it('returns an existing claim by id', async () => {
    repository.findById.mockResolvedValue(storedClaim);

    const result = await service.getClaim(storedClaim.id);

    expect(result).toBe(storedClaim);
  });

  it('throws 404 when a claim does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    let thrownError: unknown;

    try {
      await service.getClaim('missing-claim');
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(NotFoundException);
  });

  it('updates only editable claim fields', async () => {
    repository.findById.mockResolvedValue(storedClaim);

    const result = await service.updateClaim(storedClaim.id, { title: 'Updated claim' });

    expect(result.title).toBe('Updated claim');
    expect(result.description).toBe(storedClaim.description);
    expect(result.status).toBe(ClaimStatus.Pending);
    expect(result.totalAmount).toBe(0);

    expect(repository.save).toHaveBeenCalledWith({ ...storedClaim, title: 'Updated claim' });
  });

  it('throws 404 when saving a concurrently removed claim', async () => {
    repository.findById.mockResolvedValue(storedClaim);
    repository.save.mockResolvedValue(null);

    let thrownError: unknown;

    try {
      await service.updateClaim(storedClaim.id, { title: 'Updated claim' });
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(NotFoundException);
  });

  it('uses the domain state machine for status transitions', async () => {
    repository.findById.mockResolvedValue(storedClaim);

    const result = await service.updateClaimStatus(storedClaim.id, { status: ClaimStatus.InReview });
    const savedClaim = repository.save.mock.calls[0][0];

    expect(result.status).toBe(ClaimStatus.InReview);
    expect(savedClaim.status).toBe(ClaimStatus.InReview);
  });

  it('rejects invalid status transitions from the domain model', async () => {
    repository.findById.mockResolvedValue(storedClaim);

    let thrownError: unknown;

    try {
      await service.updateClaimStatus(storedClaim.id, { status: ClaimStatus.Finished });
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(InvalidClaimStatusTransitionError);
  });

  it('adds damage through the domain model and recalculates totalAmount', async () => {
    repository.findById.mockResolvedValue(storedClaim);

    const result = await service.addDamage(storedClaim.id, {
      part: damage.part,
      severity: damage.severity,
      imageUrl: damage.imageUrl,
      price: damage.price,
      score: damage.score,
    });

    expect(result.totalAmount).toBe(300);
    expect(result.damages.length).toBe(1);
    expect(result.damages[0].part).toBe(damage.part);
    expect(result.damages[0].severity).toBe(damage.severity);
    expect(result.damages[0].price).toBe(damage.price);
    expect(result.damages[0].score).toBe(damage.score);
  });

  it('updates damage through the domain model and recalculates totalAmount', async () => {
    repository.findById.mockResolvedValue({ ...storedClaim, damages: [damage], totalAmount: 300 });

    const result = await service.updateDamage(storedClaim.id, damage.id, { price: 425 });

    expect(result.totalAmount).toBe(425);
    expect(result.damages[0].price).toBe(425);
  });

  it('deletes damage through the domain model and recalculates totalAmount', async () => {
    repository.findById.mockResolvedValue({ ...storedClaim, damages: [damage], totalAmount: 300 });

    const result = await service.deleteDamage(storedClaim.id, damage.id);

    expect(result.totalAmount).toBe(0);
    expect(result.damages).toEqual([]);
  });

  it('rejects damage mutations outside PENDING through the domain model', async () => {
    repository.findById.mockResolvedValue({
      ...storedClaim,
      status: ClaimStatus.InReview,
      damages: [damage],
      totalAmount: 300,
    });

    let thrownError: unknown;

    try {
      await service.updateDamage(storedClaim.id, damage.id, { price: 425 });
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(DamageManagementNotAllowedError);
  });
});
