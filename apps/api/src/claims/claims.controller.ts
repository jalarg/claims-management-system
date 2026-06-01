import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import type { ClaimResponse, ClaimSummaryResponse } from './claim-response';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { CreateDamageDto } from './dto/create-damage.dto';
import { ListClaimsQueryDto } from './dto/list-claims-query.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { UpdateClaimStatusDto } from './dto/update-claim-status.dto';
import { UpdateDamageDto } from './dto/update-damage.dto';

@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  createClaim(@Body() dto: CreateClaimDto): Promise<ClaimResponse> {
    return this.claimsService.createClaim(dto);
  }

  @Get()
  findClaims(@Query() query: ListClaimsQueryDto): Promise<ClaimSummaryResponse[]> {
    return this.claimsService.findClaims(query.status);
  }

  @Get(':id')
  getClaim(@Param('id') id: string): Promise<ClaimResponse> {
    return this.claimsService.getClaim(id);
  }

  @Patch(':id')
  updateClaim(@Param('id') id: string, @Body() dto: UpdateClaimDto): Promise<ClaimResponse> {
    return this.claimsService.updateClaim(id, dto);
  }

  @Patch(':id/status')
  updateClaimStatus(@Param('id') id: string, @Body() dto: UpdateClaimStatusDto): Promise<ClaimResponse> {
    return this.claimsService.updateClaimStatus(id, dto);
  }

  @Post(':claimId/damages')
  addDamage(@Param('claimId') claimId: string, @Body() dto: CreateDamageDto): Promise<ClaimResponse> {
    return this.claimsService.addDamage(claimId, dto);
  }

  @Patch(':claimId/damages/:damageId')
  updateDamage(
    @Param('claimId') claimId: string,
    @Param('damageId') damageId: string,
    @Body() dto: UpdateDamageDto,
  ): Promise<ClaimResponse> {
    return this.claimsService.updateDamage(claimId, damageId, dto);
  }

  @Delete(':claimId/damages/:damageId')
  deleteDamage(@Param('claimId') claimId: string, @Param('damageId') damageId: string): Promise<ClaimResponse> {
    return this.claimsService.deleteDamage(claimId, damageId);
  }
}
