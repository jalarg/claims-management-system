import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { ClaimStatus, DamageSeverity } from '../domain';
import { MongoClaimsRepository } from './mongo-claims.repository';
import type { ClaimHydratedDocument } from './claim.schema';
import type { StoredClaim } from './claims.repository';

const claimId = '507f1f77bcf86cd799439011';
const createdAt = new Date('2026-06-01T10:00:00.000Z');
const updatedAt = new Date('2026-06-01T10:15:00.000Z');

const claimDocument = {
  _id: new Types.ObjectId(claimId),
  title: 'Front bumper claim',
  description: 'Customer reported vehicle front bumper damage after a parking incident.',
  status: ClaimStatus.Pending,
  totalAmount: 350,
  damages: [
    {
      id: 'damage-1',
      part: 'Front bumper',
      severity: DamageSeverity.High,
      imageUrl: 'https://example.com/front-bumper.jpg',
      price: 350,
      score: 8,
    },
  ],
  createdAt,
  updatedAt,
} as unknown as ClaimHydratedDocument;

const storedClaim = {
  id: claimId,
  title: 'Front bumper claim',
  description: 'Customer reported vehicle front bumper damage after a parking incident.',
  status: ClaimStatus.Pending,
  totalAmount: 350,
  damages: [
    {
      id: 'damage-1',
      part: 'Front bumper',
      severity: DamageSeverity.High,
      imageUrl: 'https://example.com/front-bumper.jpg',
      price: 350,
      score: 8,
    },
  ],
  createdAt: createdAt.toISOString(),
  updatedAt: updatedAt.toISOString(),
} satisfies StoredClaim;

function createModelMock(): {
  create: jest.Mock;
  find: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
} {
  return {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
}

function createRepository(model: ReturnType<typeof createModelMock>): MongoClaimsRepository {
  return new MongoClaimsRepository(model as unknown as Model<ClaimHydratedDocument>);
}

function queryResult<T>(value: T): { exec: jest.Mock<Promise<T>, []> } {
  return { exec: jest.fn<Promise<T>, []>().mockResolvedValue(value) };
}

describe('MongoClaimsRepository', () => {
  it('creates pending claims with an empty damage list and zero total', async () => {
    const model = createModelMock();
    const repository = createRepository(model);
    model.create.mockResolvedValue({ ...claimDocument, damages: [], totalAmount: 0 });

    const result = await repository.create({ title: claimDocument.title, description: claimDocument.description });

    expect(result.id).toBe(claimId);
    expect(result.status).toBe(ClaimStatus.Pending);
    expect(result.totalAmount).toBe(0);
    expect(result.damages).toEqual([]);
    expect(result.createdAt).toBe(createdAt.toISOString());
    expect(result.updatedAt).toBe(updatedAt.toISOString());

    expect(model.create).toHaveBeenCalledWith({
      title: claimDocument.title,
      description: claimDocument.description,
      status: ClaimStatus.Pending,
      totalAmount: 0,
      damages: [],
    });
  });

  it('finds all claims without a status filter', async () => {
    const model = createModelMock();
    const repository = createRepository(model);
    model.find.mockReturnValue(queryResult([claimDocument]));

    const result = await repository.findAll();

    expect(result.length).toBe(1);
    expect(model.find).toHaveBeenCalledWith({});
  });

  it('finds claims with a status filter', async () => {
    const model = createModelMock();
    const repository = createRepository(model);
    model.find.mockReturnValue(queryResult([claimDocument]));

    const result = await repository.findAll(ClaimStatus.Pending);

    expect(result.length).toBe(1);
    expect(result[0].status).toBe(ClaimStatus.Pending);
    expect(model.find).toHaveBeenCalledWith({ status: ClaimStatus.Pending });
  });

  it('returns null when finding by an invalid claim id', async () => {
    const model = createModelMock();
    const repository = createRepository(model);

    const result = await repository.findById('invalid-id');

    expect(result).toBeNull();
    expect(model.findById).not.toHaveBeenCalled();
  });

  it('finds a claim by id and maps embedded damages', async () => {
    const model = createModelMock();
    const repository = createRepository(model);
    model.findById.mockReturnValue(queryResult(claimDocument));

    const result = await repository.findById(claimId);

    expect(result?.id).toBe(claimId);
    expect(result?.totalAmount).toBe(350);
    expect(result?.damages[0].id).toBe('damage-1');
    expect(result?.damages[0].severity).toBe(DamageSeverity.High);
  });

  it('returns null when the claim id is not found', async () => {
    const model = createModelMock();
    const repository = createRepository(model);
    model.findById.mockReturnValue(queryResult(null));

    const result = await repository.findById(claimId);

    expect(result).toBeNull();
  });

  it('returns null when saving an invalid claim id', async () => {
    const model = createModelMock();
    const repository = createRepository(model);

    const result = await repository.save({ ...storedClaim, id: 'invalid-id' });

    expect(result).toBeNull();
    expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('saves mutable claim fields and returns the updated claim', async () => {
    const model = createModelMock();
    const repository = createRepository(model);
    model.findByIdAndUpdate.mockReturnValue(queryResult({ ...claimDocument, status: ClaimStatus.InReview }));

    const result = await repository.save({ ...storedClaim, status: ClaimStatus.InReview });

    expect(result?.status).toBe(ClaimStatus.InReview);

    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
      claimId,
      {
        title: claimDocument.title,
        description: claimDocument.description,
        status: ClaimStatus.InReview,
        totalAmount: claimDocument.totalAmount,
        damages: claimDocument.damages,
      },
      { new: true, runValidators: true },
    );
  });

  it('returns null when saving a claim that no longer exists', async () => {
    const model = createModelMock();
    const repository = createRepository(model);
    model.findByIdAndUpdate.mockReturnValue(queryResult(null));

    const result = await repository.save(storedClaim);

    expect(result).toBeNull();
  });
});
