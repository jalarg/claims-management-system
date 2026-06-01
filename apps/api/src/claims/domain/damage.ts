import { InvalidDamagePriceError, InvalidDamageScoreError } from './claim.errors';
import type { DamageSeverity } from './damage-severity';

export interface DamageProperties {
  id: string;
  part: string;
  severity: DamageSeverity;
  imageUrl: string;
  price: number;
  score: number;
}

export interface UpdateDamageProperties {
  part?: string;
  severity?: DamageSeverity;
  imageUrl?: string;
  price?: number;
  score?: number;
}

export class Damage {
  private constructor(private readonly properties: DamageProperties) {}

  static create(properties: DamageProperties): Damage {
    Damage.assertValidPrice(properties.price);
    Damage.assertValidScore(properties.score);

    return new Damage({ ...properties });
  }

  get id(): string {
    return this.properties.id;
  }

  get part(): string {
    return this.properties.part;
  }

  get severity(): DamageSeverity {
    return this.properties.severity;
  }

  get imageUrl(): string {
    return this.properties.imageUrl;
  }

  get price(): number {
    return this.properties.price;
  }

  get score(): number {
    return this.properties.score;
  }

  update(changes: UpdateDamageProperties): Damage {
    const nextProperties: DamageProperties = {
      ...this.properties,
      ...changes,
    };

    Damage.assertValidPrice(nextProperties.price);
    Damage.assertValidScore(nextProperties.score);

    return new Damage(nextProperties);
  }

  toProperties(): DamageProperties {
    return { ...this.properties };
  }

  private static assertValidPrice(price: number): void {
    if (!Number.isFinite(price) || price <= 0) {
      throw new InvalidDamagePriceError(price);
    }
  }

  private static assertValidScore(score: number): void {
    if (!Number.isInteger(score) || score < 1 || score > 10) {
      throw new InvalidDamageScoreError(score);
    }
  }
}
