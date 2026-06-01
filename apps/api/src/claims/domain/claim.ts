import { DamageManagementNotAllowedError, DamageNotFoundError } from './claim.errors';
import { ClaimStateMachine } from './claim-state-machine';
import { ClaimStatus } from './claim-status';
import type { ClaimStatus as ClaimStatusValue } from './claim-status';
import { Damage } from './damage';
import type { DamageProperties, UpdateDamageProperties } from './damage';
import { FinishClaimPolicy } from './finish-claim-policy';

export interface CreateClaimProperties {
  id: string;
  title: string;
  description: string;
}

export interface ClaimProperties extends CreateClaimProperties {
  status: ClaimStatusValue;
  damages: DamageProperties[];
}

export class Claim {
  private readonly damageItems: Damage[];

  private constructor(
    private readonly idValue: string,
    private readonly titleValue: string,
    private readonly descriptionValue: string,
    private statusValue: ClaimStatusValue,
    damages: Damage[],
  ) {
    this.damageItems = [...damages];
  }

  static create(properties: CreateClaimProperties): Claim {
    return new Claim(properties.id, properties.title, properties.description, ClaimStatus.Pending, []);
  }

  static fromProperties(properties: ClaimProperties): Claim {
    const damages = properties.damages.map((damage) => Damage.create(damage));

    return new Claim(properties.id, properties.title, properties.description, properties.status, damages);
  }

  get id(): string {
    return this.idValue;
  }

  get title(): string {
    return this.titleValue;
  }

  get description(): string {
    return this.descriptionValue;
  }

  get status(): ClaimStatusValue {
    return this.statusValue;
  }

  get damages(): readonly Damage[] {
    return [...this.damageItems];
  }

  get totalAmount(): number {
    return this.damageItems.reduce((total, damage) => total + damage.price, 0);
  }

  transitionTo(nextStatus: ClaimStatusValue): void {
    ClaimStateMachine.assertCanTransition(this.statusValue, nextStatus);

    if (nextStatus === ClaimStatus.Finished) {
      FinishClaimPolicy.assertCanFinish({
        description: this.descriptionValue,
        damages: this.damageItems,
      });
    }

    this.statusValue = nextStatus;
  }

  addDamage(properties: DamageProperties): void {
    this.assertCanManageDamages();
    this.damageItems.push(Damage.create(properties));
  }

  updateDamage(damageId: string, changes: UpdateDamageProperties): void {
    this.assertCanManageDamages();
    const damageIndex = this.findDamageIndex(damageId);

    this.damageItems[damageIndex] = this.damageItems[damageIndex].update(changes);
  }

  deleteDamage(damageId: string): void {
    this.assertCanManageDamages();
    const damageIndex = this.findDamageIndex(damageId);

    this.damageItems.splice(damageIndex, 1);
  }

  toProperties(): ClaimProperties {
    return {
      id: this.idValue,
      title: this.titleValue,
      description: this.descriptionValue,
      status: this.statusValue,
      damages: this.damageItems.map((damage) => damage.toProperties()),
    };
  }

  private assertCanManageDamages(): void {
    if (this.statusValue !== ClaimStatus.Pending) {
      throw new DamageManagementNotAllowedError(this.statusValue);
    }
  }

  private findDamageIndex(damageId: string): number {
    const damageIndex = this.damageItems.findIndex((damage) => damage.id === damageId);

    if (damageIndex === -1) {
      throw new DamageNotFoundError(damageId);
    }

    return damageIndex;
  }
}
