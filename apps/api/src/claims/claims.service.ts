import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import type { ClaimResponse } from './claim-response';
import { toClaimSummaryResponse } from './claim-response';
import type { ClaimSummaryResponse } from './claim-response';
import type { CreateClaimDto } from './dto/create-claim.dto';
import type { CreateDamageDto } from './dto/create-damage.dto';
import type { UpdateClaimDto } from './dto/update-claim.dto';
import type { UpdateClaimStatusDto } from './dto/update-claim-status.dto';
import type { UpdateDamageDto } from './dto/update-damage.dto';
import { Claim } from './domain';
import type { ClaimProperties } from './domain';
import { CLAIMS_REPOSITORY } from './persistence/claims.repository';
import type { ClaimsRepository, StoredClaim } from './persistence/claims.repository';

@Injectable()
export class ClaimsService {
  constructor(@Inject(CLAIMS_REPOSITORY) private readonly claimsRepository: ClaimsRepository) {}

  createClaim(dto: CreateClaimDto): Promise<ClaimResponse> {
    return this.claimsRepository.create({
      title: dto.title,
      description: dto.description,
    });
  }

  async findClaims(status?: StoredClaim['status']): Promise<ClaimSummaryResponse[]> {
    const claims = await this.claimsRepository.findAll(status);

    return claims.map(toClaimSummaryResponse);
  }

  async getClaim(id: string): Promise<ClaimResponse> {
    return this.getExistingClaim(id);
  }

  async updateClaim(id: string, dto: UpdateClaimDto): Promise<ClaimResponse> {
    const claim = await this.getExistingClaim(id);

    return this.saveExistingClaim({
      ...claim,
      ...dto,
    });
  }

  async updateClaimStatus(id: string, dto: UpdateClaimStatusDto): Promise<ClaimResponse> {
    const storedClaim = await this.getExistingClaim(id);
    const claim = ClaimsService.toDomainClaim(storedClaim);

    claim.transitionTo(dto.status);

    return this.saveDomainClaim(storedClaim, claim);
  }

  async addDamage(claimId: string, dto: CreateDamageDto): Promise<ClaimResponse> {
    const storedClaim = await this.getExistingClaim(claimId);
    const claim = ClaimsService.toDomainClaim(storedClaim);

    claim.addDamage({
      id: randomUUID(),
      part: dto.part,
      severity: dto.severity,
      imageUrl: dto.imageUrl,
      price: dto.price,
      score: dto.score,
    });

    return this.saveDomainClaim(storedClaim, claim);
  }

  async updateDamage(claimId: string, damageId: string, dto: UpdateDamageDto): Promise<ClaimResponse> {
    const storedClaim = await this.getExistingClaim(claimId);
    const claim = ClaimsService.toDomainClaim(storedClaim);

    claim.updateDamage(damageId, dto);

    return this.saveDomainClaim(storedClaim, claim);
  }

  async deleteDamage(claimId: string, damageId: string): Promise<ClaimResponse> {
    const storedClaim = await this.getExistingClaim(claimId);
    const claim = ClaimsService.toDomainClaim(storedClaim);

    claim.deleteDamage(damageId);

    return this.saveDomainClaim(storedClaim, claim);
  }

  private async getExistingClaim(id: string): Promise<StoredClaim> {
    const claim = await this.claimsRepository.findById(id);

    if (claim === null) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Claim not found',
      });
    }

    return claim;
  }

  private async saveExistingClaim(claim: StoredClaim): Promise<StoredClaim> {
    const savedClaim = await this.claimsRepository.save(claim);

    if (savedClaim === null) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Claim not found',
      });
    }

    return savedClaim;
  }

  private saveDomainClaim(storedClaim: StoredClaim, claim: Claim): Promise<StoredClaim> {
    return this.saveExistingClaim({
      ...storedClaim,
      ...claim.toProperties(),
      totalAmount: claim.totalAmount,
    });
  }

  private static toDomainClaim(claim: StoredClaim): Claim {
    const properties: ClaimProperties = {
      id: claim.id,
      title: claim.title,
      description: claim.description,
      status: claim.status,
      damages: claim.damages,
    };

    return Claim.fromProperties(properties);
  }
}
