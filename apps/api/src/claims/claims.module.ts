import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { ClaimDocument, ClaimSchema } from './persistence/claim.schema';
import { CLAIMS_REPOSITORY } from './persistence/claims.repository';
import { MongoClaimsRepository } from './persistence/mongo-claims.repository';

@Module({
  imports: [MongooseModule.forFeature([{ name: ClaimDocument.name, schema: ClaimSchema }])],
  controllers: [ClaimsController],
  providers: [
    ClaimsService,
    {
      provide: CLAIMS_REPOSITORY,
      useClass: MongoClaimsRepository,
    },
  ],
})
export class ClaimsModule {}
