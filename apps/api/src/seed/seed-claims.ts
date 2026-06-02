import "reflect-metadata";

import { randomUUID } from "crypto";
import { config } from "dotenv";
import { connect, disconnect, model } from "mongoose";

import { ClaimStatus, DamageSeverity } from "../claims/domain";
import type { ClaimStatusValue, DamageSeverityValue } from "../claims/domain";
import { ClaimDocument, ClaimSchema } from "../claims/persistence/claim.schema";

interface SeedDamageInput {
  part: string;
  severity: DamageSeverityValue;
  imageUrl: string;
  price: number;
  score: number;
}

interface SeedDamage extends SeedDamageInput {
  id: string;
}

interface SeedClaimInput {
  title: string;
  description: string;
  status: ClaimStatusValue;
  damages: SeedDamageInput[];
}

interface SeedClaim {
  title: string;
  description: string;
  status: ClaimStatusValue;
  totalAmount: number;
  damages: SeedDamage[];
}

const fallbackMongoUri = "mongodb://localhost:27017/claims-management";

async function seedClaims(): Promise<void> {
  config();

  const mongoUri = process.env.MONGO_URI ?? fallbackMongoUri;

  await connect(mongoUri);

  const claimModel = model(ClaimDocument.name, ClaimSchema);
  const seedClaimInputs = createSeedClaimInputs();
  const seedTitles = seedClaimInputs.map((claim) => claim.title);
  const seedClaims = seedClaimInputs.map(toSeedClaim);

  await claimModel.deleteMany({ title: { $in: seedTitles } }).exec();
  await claimModel.insertMany(seedClaims);
  await disconnect();

  console.log(`Seeded ${seedClaims.length} claims into ${mongoUri}.`);
}

function createSeedClaimInputs(): SeedClaimInput[] {
  return [
    {
      title: "[Seed] Pending claim without damages",
      description:
        "A simple pending claim that is ready for demo damage entry.",
      status: ClaimStatus.Pending,
      damages: [],
    },
    {
      title: "[Seed] Pending claim with multiple damages",
      description:
        "Pending claim with several damages for demonstrating totals and damage management.",
      status: ClaimStatus.Pending,
      damages: [
        createDamageInput("Front bumper", DamageSeverity.Mid, 350.5, 7),
        createDamageInput("Windshield", DamageSeverity.Low, 220, 5),
        createDamageInput("Headlight", DamageSeverity.High, 425.25, 8),
      ],
    },
    {
      title: "[Seed] In-review high severity windshield claim",
      description:
        "This in-review claim has a high severity windshield damage and a description longer than one hundred characters so reviewers can test the finish policy successfully.",
      status: ClaimStatus.InReview,
      damages: [createDamageInput("Windshield", DamageSeverity.High, 900, 9)],
    },
    {
      title: "[Seed] Canceled claim",
      description:
        "Canceled claim used to demonstrate terminal status behavior in the UI.",
      status: ClaimStatus.Canceled,
      damages: [],
    },
  ];
}

function createDamageInput(
  part: string,
  severity: DamageSeverityValue,
  price: number,
  score: number,
): SeedDamageInput {
  const imageUrlByPart: Record<string, string> = {
    "Front bumper":
      "https://images.unsplash.com/photo-1683446748468-eba61cda9473?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    Windshield:
      "https://images.unsplash.com/photo-1597328290883-50c5787b7c7e?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    Headlight:
      "https://images.unsplash.com/photo-1613042964418-89c800809319?q=80&w=1192&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  };

  return {
    part,
    severity,
    imageUrl: imageUrlByPart[part],
    price,
    score,
  };
}

function toSeedClaim(claim: SeedClaimInput): SeedClaim {
  const damages = claim.damages.map(toSeedDamage);

  return {
    title: claim.title,
    description: claim.description,
    status: claim.status,
    totalAmount: calculateTotalAmount(damages),
    damages,
  };
}

function toSeedDamage(damage: SeedDamageInput): SeedDamage {
  return {
    id: randomUUID(),
    ...damage,
  };
}

function calculateTotalAmount(damages: readonly SeedDamageInput[]): number {
  return damages.reduce((total, damage) => total + damage.price, 0);
}

void seedClaims().catch(async (error: unknown) => {
  await disconnect();
  console.error(error);
  process.exitCode = 1;
});
