import { INestApplication } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Model } from 'mongoose';
import request = require('supertest');
import type { Response } from 'supertest';

import { ClaimsModule } from '../src/claims/claims.module';
import { ClaimStatus, DamageSeverity } from '../src/claims/domain';
import type { ClaimStatusValue, DamageProperties, DamageSeverityValue } from '../src/claims/domain';
import { ClaimDocument } from '../src/claims/persistence/claim.schema';
import type { ClaimHydratedDocument } from '../src/claims/persistence/claim.schema';
import { ApiExceptionFilter } from '../src/common/filters/api-exception.filter';
import { createApiValidationPipe } from '../src/common/pipes/api-validation.pipe';

interface ClaimSummaryBody {
  id: string;
  title: string;
  description: string;
  status: ClaimStatusValue;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

interface ClaimBody extends ClaimSummaryBody {
  damages: DamageProperties[];
}

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

const createClaimBody = {
  title: 'Front bumper claim',
  description: 'Customer reported vehicle front bumper damage after a parking incident.',
};

const highSeverityDescription = `${'High severity claim description. '.repeat(4)}extra detail`;

function parseClaim(response: Response): ClaimBody {
  return response.body as ClaimBody;
}

function parseClaimSummaries(response: Response): ClaimSummaryBody[] {
  return response.body as ClaimSummaryBody[];
}

function parseError(response: Response): ErrorBody {
  return response.body as ErrorBody;
}

function createDamage(part: string, price: number, severity: DamageSeverityValue = DamageSeverity.Mid): Omit<DamageProperties, 'id'> {
  return {
    part,
    severity,
    imageUrl: `https://example.com/${part.toLowerCase().replaceAll(' ', '-')}.jpg`,
    price,
    score: 7,
  };
}

describe('Claims API integration', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let claimModel: Model<ClaimHydratedDocument>;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    const moduleRef = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoServer.getUri()), ClaimsModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createApiValidationPipe());
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();

    claimModel = moduleRef.get<Model<ClaimHydratedDocument>>(getModelToken(ClaimDocument.name));
  });

  afterEach(async () => {
    await claimModel.deleteMany({}).exec();
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  it('creates claims, lists summaries, and returns claim detail with damages', async () => {
    const createResponse = await request(app.getHttpServer()).post('/claims').send(createClaimBody).expect(201);
    const createdClaim = parseClaim(createResponse);

    expect(createdClaim.status).toBe(ClaimStatus.Pending);
    expect(createdClaim.totalAmount).toBe(0);
    expect(createdClaim.damages).toEqual([]);

    const listResponse = await request(app.getHttpServer()).get('/claims').expect(200);
    const summaries = parseClaimSummaries(listResponse);

    expect(summaries.length).toBe(1);
    expect(summaries[0].id).toBe(createdClaim.id);
    expect('damages' in summaries[0]).toBe(false);

    const detailResponse = await request(app.getHttpServer()).get(`/claims/${createdClaim.id}`).expect(200);
    const detail = parseClaim(detailResponse);

    expect(detail.id).toBe(createdClaim.id);
    expect(detail.damages).toEqual([]);
  });

  it('rejects client-owned totalAmount on claim creation', async () => {
    const response = await request(app.getHttpServer())
      .post('/claims')
      .send({ ...createClaimBody, totalAmount: 999 })
      .expect(400);
    const error = parseError(response);

    expect(error.statusCode).toBe(400);
    expect(error.error).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Request validation failed');
  });

  it('recalculates and persists totalAmount after add, edit, and delete damage', async () => {
    const createResponse = await request(app.getHttpServer()).post('/claims').send(createClaimBody).expect(201);
    const claim = parseClaim(createResponse);

    const firstDamageResponse = await request(app.getHttpServer())
      .post(`/claims/${claim.id}/damages`)
      .send(createDamage('Front bumper', 100.25))
      .expect(201);
    const claimWithFirstDamage = parseClaim(firstDamageResponse);

    expect(claimWithFirstDamage.totalAmount).toBe(100.25);

    const secondDamageResponse = await request(app.getHttpServer())
      .post(`/claims/${claim.id}/damages`)
      .send(createDamage('Door', 249.75))
      .expect(201);
    const claimWithSecondDamage = parseClaim(secondDamageResponse);

    expect(claimWithSecondDamage.totalAmount).toBe(350);

    const persistedAfterAdd = await claimModel.findById(claim.id).exec();

    expect(persistedAfterAdd?.totalAmount).toBe(350);
    expect(persistedAfterAdd?.damages.reduce((total, damage) => total + damage.price, 0)).toBe(350);

    const doorDamage = claimWithSecondDamage.damages.find((damage) => damage.part === 'Door');

    expect(doorDamage).toBeDefined();

    const updatedDamageResponse = await request(app.getHttpServer())
      .patch(`/claims/${claim.id}/damages/${doorDamage?.id}`)
      .send({ price: 300 })
      .expect(200);
    const claimWithUpdatedDamage = parseClaim(updatedDamageResponse);

    expect(claimWithUpdatedDamage.totalAmount).toBe(400.25);

    const persistedAfterUpdate = await claimModel.findById(claim.id).exec();

    expect(persistedAfterUpdate?.totalAmount).toBe(400.25);
    expect(persistedAfterUpdate?.damages.reduce((total, damage) => total + damage.price, 0)).toBe(400.25);

    const bumperDamage = claimWithUpdatedDamage.damages.find((damage) => damage.part === 'Front bumper');

    expect(bumperDamage).toBeDefined();

    const deleteDamageResponse = await request(app.getHttpServer())
      .delete(`/claims/${claim.id}/damages/${bumperDamage?.id}`)
      .expect(200);
    const claimAfterDelete = parseClaim(deleteDamageResponse);

    expect(claimAfterDelete.totalAmount).toBe(300);
    expect(claimAfterDelete.damages.length).toBe(1);

    const persistedAfterDelete = await claimModel.findById(claim.id).exec();

    expect(persistedAfterDelete?.totalAmount).toBe(300);
    expect(persistedAfterDelete?.damages.reduce((total, damage) => total + damage.price, 0)).toBe(300);
  });

  it('returns a validation error for missing required damage fields', async () => {
    const createResponse = await request(app.getHttpServer()).post('/claims').send(createClaimBody).expect(201);
    const claim = parseClaim(createResponse);

    const response = await request(app.getHttpServer())
      .post(`/claims/${claim.id}/damages`)
      .send({ part: 'Front bumper' })
      .expect(400);
    const error = parseError(response);

    expect(error.statusCode).toBe(400);
    expect(error.error).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Request validation failed');
    expect(Array.isArray(error.details)).toBe(true);
  });

  it('rejects invalid status transitions with the consistent error shape', async () => {
    const createResponse = await request(app.getHttpServer()).post('/claims').send(createClaimBody).expect(201);
    const claim = parseClaim(createResponse);

    const response = await request(app.getHttpServer())
      .patch(`/claims/${claim.id}/status`)
      .send({ status: ClaimStatus.Finished })
      .expect(409);
    const error = parseError(response);

    expect(error.statusCode).toBe(409);
    expect(error.error).toBe('INVALID_STATE_TRANSITION');
    expect(error.message).toBe(`Cannot transition claim from ${ClaimStatus.Pending} to ${ClaimStatus.Finished}.`);
  });

  it('blocks finishing high-severity claims with short descriptions', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/claims')
      .send({ ...createClaimBody, description: 'short description' })
      .expect(201);
    const claim = parseClaim(createResponse);

    await request(app.getHttpServer())
      .post(`/claims/${claim.id}/damages`)
      .send(createDamage('Roof', 500, DamageSeverity.High))
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/claims/${claim.id}/status`)
      .send({ status: ClaimStatus.InReview })
      .expect(200);

    const response = await request(app.getHttpServer())
      .patch(`/claims/${claim.id}/status`)
      .send({ status: ClaimStatus.Finished })
      .expect(422);
    const error = parseError(response);

    expect(error.statusCode).toBe(422);
    expect(error.error).toBe('BUSINESS_RULE_VIOLATION');
  });

  it('allows finishing high-severity claims with descriptions longer than 100 characters', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/claims')
      .send({ ...createClaimBody, description: highSeverityDescription })
      .expect(201);
    const claim = parseClaim(createResponse);

    await request(app.getHttpServer())
      .post(`/claims/${claim.id}/damages`)
      .send(createDamage('Hood', 500, DamageSeverity.High))
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/claims/${claim.id}/status`)
      .send({ status: ClaimStatus.InReview })
      .expect(200);

    const finishResponse = await request(app.getHttpServer())
      .patch(`/claims/${claim.id}/status`)
      .send({ status: ClaimStatus.Finished })
      .expect(200);
    const finishedClaim = parseClaim(finishResponse);

    expect(finishedClaim.status).toBe(ClaimStatus.Finished);
  });
});
