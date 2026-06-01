import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { ClaimStatus } from '../domain';
import type { ClaimStatusValue, DamageProperties } from '../domain';
import { ClaimDocument } from './claim.schema';
import type { ClaimHydratedDocument } from './claim.schema';
import type { ClaimsRepository, CreateStoredClaim, StoredClaim } from './claims.repository';

@Injectable()
export class MongoClaimsRepository implements ClaimsRepository {
  constructor(@InjectModel(ClaimDocument.name) private readonly claimModel: Model<ClaimHydratedDocument>) {}

  async create(claim: CreateStoredClaim): Promise<StoredClaim> {
    const document = await this.claimModel.create({
      ...claim,
      status: ClaimStatus.Pending,
      totalAmount: 0,
      damages: [],
    });

    return MongoClaimsRepository.toStoredClaim(document);
  }

  async findAll(status?: ClaimStatusValue): Promise<StoredClaim[]> {
    const filter = status === undefined ? {} : { status };
    const documents = await this.claimModel.find(filter).exec();

    return documents.map((document) => MongoClaimsRepository.toStoredClaim(document));
  }

  async findById(id: string): Promise<StoredClaim | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const document = await this.claimModel.findById(id).exec();

    return document === null ? null : MongoClaimsRepository.toStoredClaim(document);
  }

  async save(claim: StoredClaim): Promise<StoredClaim | null> {
    if (!Types.ObjectId.isValid(claim.id)) {
      return null;
    }

    const document = await this.claimModel
      .findByIdAndUpdate(
        claim.id,
        {
          title: claim.title,
          description: claim.description,
          status: claim.status,
          totalAmount: claim.totalAmount,
          damages: claim.damages,
        },
        { new: true, runValidators: true },
      )
      .exec();

    return document === null ? null : MongoClaimsRepository.toStoredClaim(document);
  }

  private static toStoredClaim(document: ClaimHydratedDocument): StoredClaim {
    return {
      id: document._id.toString(),
      title: document.title,
      description: document.description,
      status: document.status,
      totalAmount: document.totalAmount,
      damages: document.damages.map((damage): DamageProperties => ({
        id: damage.id,
        part: damage.part,
        severity: damage.severity,
        imageUrl: damage.imageUrl,
        price: damage.price,
        score: damage.score,
      })),
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  }
}
