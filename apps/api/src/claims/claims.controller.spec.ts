import { ClaimStatus, DamageSeverity } from './domain';
import { ClaimsController } from './claims.controller';
import type { ClaimResponse, ClaimSummaryResponse } from './claim-response';
import type { ClaimsService } from './claims.service';

const claimResponse = {
  id: '507f1f77bcf86cd799439011',
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
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-01T10:00:00.000Z',
} satisfies ClaimResponse;

const claimSummary = {
  id: claimResponse.id,
  title: claimResponse.title,
  description: claimResponse.description,
  status: claimResponse.status,
  totalAmount: claimResponse.totalAmount,
  createdAt: claimResponse.createdAt,
  updatedAt: claimResponse.updatedAt,
} satisfies ClaimSummaryResponse;

function createServiceMock(): jest.Mocked<ClaimsService> {
  return {
    createClaim: jest.fn(),
    findClaims: jest.fn(),
    getClaim: jest.fn(),
    updateClaim: jest.fn(),
    updateClaimStatus: jest.fn(),
    addDamage: jest.fn(),
    updateDamage: jest.fn(),
    deleteDamage: jest.fn(),
  } as unknown as jest.Mocked<ClaimsService>;
}

describe('ClaimsController', () => {
  let controller: ClaimsController;
  let service: jest.Mocked<ClaimsService>;

  beforeEach(() => {
    service = createServiceMock();
    controller = new ClaimsController(service);
  });

  it('creates a claim through the service', async () => {
    const dto = { title: claimResponse.title, description: claimResponse.description };
    service.createClaim.mockResolvedValue(claimResponse);

    const result = await controller.createClaim(dto);

    expect(result).toBe(claimResponse);
    expect(service.createClaim).toHaveBeenCalledWith(dto);
  });

  it('lists claims through the service with an optional status filter', async () => {
    service.findClaims.mockResolvedValue([claimSummary]);

    const result = await controller.findClaims({ status: ClaimStatus.Pending });

    expect(result).toEqual([claimSummary]);
    expect('damages' in result[0]).toBe(false);
    expect(service.findClaims).toHaveBeenCalledWith(ClaimStatus.Pending);
  });

  it('gets a claim by id through the service', async () => {
    service.getClaim.mockResolvedValue(claimResponse);

    const result = await controller.getClaim(claimResponse.id);

    expect(result).toBe(claimResponse);
    expect(result.damages).toEqual(claimResponse.damages);
    expect(service.getClaim).toHaveBeenCalledWith(claimResponse.id);
  });

  it('updates editable claim fields through the service', async () => {
    const dto = { title: 'Updated claim' };
    service.updateClaim.mockResolvedValue({ ...claimResponse, ...dto });

    const result = await controller.updateClaim(claimResponse.id, dto);

    expect(result.title).toBe(dto.title);
    expect(service.updateClaim).toHaveBeenCalledWith(claimResponse.id, dto);
  });

  it('updates claim status through the service', async () => {
    const dto = { status: ClaimStatus.InReview };
    service.updateClaimStatus.mockResolvedValue({ ...claimResponse, status: ClaimStatus.InReview });

    const result = await controller.updateClaimStatus(claimResponse.id, dto);

    expect(result.status).toBe(dto.status);
    expect(service.updateClaimStatus).toHaveBeenCalledWith(claimResponse.id, dto);
  });

  it('adds damage through the service', async () => {
    const dto = {
      part: 'Front bumper',
      severity: DamageSeverity.High,
      imageUrl: 'https://example.com/front-bumper.jpg',
      price: 350,
      score: 8,
    };
    service.addDamage.mockResolvedValue({ ...claimResponse, totalAmount: 350 });

    const result = await controller.addDamage(claimResponse.id, dto);

    expect(result.totalAmount).toBe(350);
    expect(service.addDamage).toHaveBeenCalledWith(claimResponse.id, dto);
  });

  it('updates damage through the service', async () => {
    const dto = { price: 425 };
    service.updateDamage.mockResolvedValue({ ...claimResponse, totalAmount: 425 });

    const result = await controller.updateDamage(claimResponse.id, 'damage-1', dto);

    expect(result.totalAmount).toBe(425);
    expect(service.updateDamage).toHaveBeenCalledWith(claimResponse.id, 'damage-1', dto);
  });

  it('deletes damage through the service', async () => {
    service.deleteDamage.mockResolvedValue(claimResponse);

    const result = await controller.deleteDamage(claimResponse.id, 'damage-1');

    expect(result).toBe(claimResponse);
    expect(service.deleteDamage).toHaveBeenCalledWith(claimResponse.id, 'damage-1');
  });
});
