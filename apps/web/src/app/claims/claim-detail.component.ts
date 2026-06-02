import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";

import { ConfirmDialogComponent } from "../shared/confirm-dialog/confirm-dialog.component";
import { ConfirmDialogService } from "../shared/confirm-dialog/confirm-dialog.service";
import { ClaimsApiService } from "./claims-api.service";
import type {
  ClaimDetail,
  ClaimStatus,
  CreateDamageRequest,
  DamageSeverity,
} from "./claims-api.types";

@Component({
  selector: "app-claim-detail",
  imports: [ConfirmDialogComponent, ReactiveFormsModule, RouterLink],
  template: `
    <main class="page">
      <a routerLink="/claims" class="back-link">Back to claims</a>

      @if (isLoading()) {
        <p class="notice">Loading claim...</p>
      } @else if (loadError()) {
        <p class="notice error" role="alert">{{ loadError() }}</p>
      } @else if (claim(); as claim) {
        <header class="page-header">
          <p class="eyebrow">{{ claim.status }}</p>
          <h1>{{ claim.title }}</h1>
          <p>{{ claim.description }}</p>
          <p class="total">Total: {{ derivedTotal() }}</p>
        </header>

        @if (availableTransitionActions().length > 0) {
          <section class="actions" aria-label="Status transition actions">
            @for (action of availableTransitionActions(); track action.status) {
              <button
                type="button"
                (click)="transitionTo(action.status)"
                [disabled]="isSaving()"
              >
                {{ action.label }}
              </button>
            }
          </section>
        }

        @if (transitionError()) {
          <p class="notice error" role="alert">{{ transitionError() }}</p>
        }

        <section class="card" aria-labelledby="damage-heading">
          <div class="section-heading">
            <h2 id="damage-heading">Damages</h2>
            @if (!canManageDamages()) {
              <p class="notice">
                Damage changes are available only while claim is pending.
              </p>
            }
          </div>

          @if (canManageDamages()) {
            <form
              class="damage-form"
              [formGroup]="damageForm"
              (ngSubmit)="addDamage()"
              aria-label="Add damage"
            >
              <label>
                Part
                <input type="text" formControlName="part" />
              </label>

              <label>
                Severity
                <select formControlName="severity">
                  @for (severity of severityOptions; track severity) {
                    <option [value]="severity">{{ severity }}</option>
                  }
                </select>
              </label>

              <label>
                Image URL
                <input type="url" formControlName="imageUrl" />
              </label>

              <label>
                Price
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  formControlName="price"
                />
              </label>

              <label>
                Score
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  formControlName="score"
                />
              </label>

              <button
                type="submit"
                [disabled]="isSaving() || damageForm.invalid"
              >
                Add damage
              </button>
            </form>
          }

          @if (damageError()) {
            <p class="notice error" role="alert">{{ damageError() }}</p>
          }

          @if (hasDamages()) {
            <div class="table-wrap">
              <table>
                <colgroup>
                  <col class="part-col" />
                  <col class="severity-col" />
                  <col class="score-col" />
                  <col class="price-col" />
                  <col class="image-col" />
                  @if (canManageDamages()) {
                    <col class="actions-col" />
                  }
                </colgroup>

                <thead>
                  <tr>
                    <th scope="col">Part</th>
                    <th scope="col">Severity</th>
                    <th scope="col">Score</th>
                    <th scope="col">Price</th>
                    <th scope="col">Image</th>
                    @if (canManageDamages()) {
                      <th scope="col">Actions</th>
                    }
                  </tr>
                </thead>

                <tbody>
                  @for (damage of claim.damages; track damage.id) {
                    <tr>
                      <td>{{ damage.part }}</td>
                      <td>{{ damage.severity }}</td>
                      <td>{{ damage.score }}</td>
                      <td>
                        @if (canManageDamages()) {
                          <label class="sr-only" [for]="'price-' + damage.id"
                            >Price for {{ damage.part }}</label
                          >
                          <input
                            [id]="'price-' + damage.id"
                            class="price-input"
                            type="number"
                            min="0.01"
                            step="0.01"
                            [value]="damage.price"
                            (change)="
                              updateDamagePriceFromEvent(damage.id, $event)
                            "
                          />
                        } @else {
                          {{ damage.price }}
                        }
                      </td>

                      <td class="image-cell">
                        @if (hasDamageImageUrl(damage.imageUrl)) {
                          <a
                            class="image-link"
                            [href]="damage.imageUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View image"
                          >
                            <img
                              class="damage-thumb"
                              [src]="damage.imageUrl"
                              [alt]="damage.part + ' damage image'"
                              loading="lazy"
                              (error)="useFallbackImage($event)"
                            />
                          </a>
                        } @else {
                          <img
                            class="damage-thumb"
                            [src]="fallbackDamageImageUrl"
                            [alt]="damage.part + ' damage image'"
                            loading="lazy"
                            (error)="useFallbackImage($event)"
                          />
                        }
                      </td>

                      @if (canManageDamages()) {
                        <td class="row-actions">
                          <button
                            type="button"
                            class="danger"
                            (click)="deleteDamage(damage.id)"
                            [disabled]="isSaving()"
                          >
                            Delete
                          </button>
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="notice">No damages recorded.</p>
          }
        </section>
      }
    </main>
    <app-confirm-dialog />
  `,
  styles: `
    .page {
      max-width: 64rem;
      margin: 0 auto;
      padding: 2rem;
    }

    .back-link {
      display: inline-block;
      margin-bottom: 1rem;
      color: #2563eb;
      font-weight: 700;
    }

    .page-header,
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      background: #fff;
      padding: 1.25rem;
    }

    .page-header {
      margin-bottom: 1rem;
    }

    .eyebrow {
      margin: 0 0 0.25rem;
      color: #2563eb;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1,
    h2,
    p {
      margin-top: 0;
    }

    .section-heading {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: baseline;
      margin-bottom: 1rem;
    }

    .total {
      margin-bottom: 0;
      font-weight: 800;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .damage-form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: 0.75rem;
      align-items: end;
      margin-bottom: 1rem;
      padding: 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      background: #f8fafc;
    }

    label {
      display: grid;
      gap: 0.35rem;
      color: #334155;
      font-weight: 700;
    }

    input,
    select {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font: inherit;
      padding: 0.55rem 0.7rem;
    }

    button {
      border: 1px solid #2563eb;
      border-radius: 999px;
      background: #2563eb;
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      padding: 0.6rem 0.9rem;
    }

    button.danger {
      border-color: #b91c1c;
      background: #b91c1c;
      font-size: 0.85rem;
      padding: 0.4rem 0.7rem;
      white-space: nowrap;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .part-col {
      width: 22%;
    }

    .severity-col {
      width: 14%;
    }

    .score-col {
      width: 12%;
    }

    .price-col {
      width: 18%;
    }

    .image-col {
      width: 16%;
    }

    .actions-col {
      width: 18%;
    }

    th,
    td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    th {
      color: #475569;
      font-size: 0.8rem;
      text-transform: uppercase;
    }

    .price-input {
      max-width: 8rem;
    }

    .image-cell {
      vertical-align: middle;
    }

    .image-link {
      display: inline-block;
      line-height: 0;
    }

    .damage-thumb {
      width: 72px;
      height: 52px;
      object-fit: cover;
      border: 1px solid #cbd5e1;
      border-radius: 0.35rem;
      background: #f8fafc;
      display: block;
    }

    .row-actions {
      vertical-align: middle;
      white-space: nowrap;
    }

    .notice {
      color: #475569;
    }

    .error {
      color: #b91c1c;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClaimDetailComponent implements OnInit {
  private readonly claimsApi = inject(ClaimsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly transitionActionsByStatus: Partial<
    Record<ClaimStatus, readonly { status: ClaimStatus; label: string }[]>
  > = {
    PENDING: [
      { status: "IN_REVIEW", label: "Start review" },
      { status: "CANCELED", label: "Cancel claim" },
    ],
    IN_REVIEW: [{ status: "FINISHED", label: "Finish claim" }],
  };

  readonly availableTransitionActions = computed(() => {
    const status = this.claim()?.status;

    return status ? (this.transitionActionsByStatus[status] ?? []) : [];
  });
  readonly fallbackDamageImageUrl = "/assets/damages/default-damage.svg";
  readonly severityOptions: readonly DamageSeverity[] = ["LOW", "MID", "HIGH"];
  readonly claim = signal<ClaimDetail | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly transitionError = signal<string | null>(null);
  readonly damageError = signal<string | null>(null);
  readonly hasDamages = computed(() => (this.claim()?.damages.length ?? 0) > 0);
  readonly canManageDamages = computed(
    () => this.claim()?.status === "PENDING",
  );
  readonly derivedTotal = computed(
    () =>
      this.claim()?.damages.reduce(
        (total, damage) => total + damage.price,
        0,
      ) ?? 0,
  );
  readonly damageForm = this.formBuilder.nonNullable.group({
    part: ["", Validators.required],
    severity: ["MID" as DamageSeverity, Validators.required],
    imageUrl: ["", Validators.required],
    price: [0, [Validators.required, Validators.min(0.01)]],
    score: [
      1,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(10),
        integerValidator,
      ],
    ],
  });

  ngOnInit(): void {
    this.loadClaim();
  }

  async transitionTo(status: ClaimStatus): Promise<void> {
    const claim = this.claim();

    if (claim === null) {
      return;
    }

    if (!(await this.confirmStatusTransition(status))) {
      return;
    }

    this.isSaving.set(true);
    this.transitionError.set(null);

    this.claimsApi
      .updateClaimStatus(claim.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedClaim) => this.applyClaimUpdate(updatedClaim),
        error: (error: unknown) => {
          this.transitionError.set(this.claimsApi.getErrorMessage(error));
          this.isSaving.set(false);
        },
      });
  }

  confirmStatusTransition(status: ClaimStatus): Promise<boolean> {
    if (status === "CANCELED") {
      return this.confirmDialog.confirm({
        title: "Cancel claim",
        message: "Cancel this claim? This action cannot be undone.",
        confirmLabel: "Cancel claim",
        cancelLabel: "Keep claim",
        variant: "danger",
      });
    }

    if (status === "FINISHED") {
      return this.confirmDialog.confirm({
        title: "Finish claim",
        message: "Finish this claim? Damage changes will no longer be available.",
        confirmLabel: "Finish claim",
        cancelLabel: "Keep editing",
        variant: "default",
      });
    }

    return Promise.resolve(true);
  }

  addDamage(): void {
    const claim = this.claim();

    if (claim === null || !this.canManageDamages()) {
      return;
    }

    if (this.damageForm.invalid) {
      this.damageForm.markAllAsTouched();
      return;
    }

    const damage = this.toCreateDamageRequest();

    this.isSaving.set(true);
    this.damageError.set(null);

    this.claimsApi
      .createDamage(claim.id, damage)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedClaim) => {
          this.applyClaimUpdate(updatedClaim);
          this.damageForm.reset({
            part: "",
            severity: "MID",
            imageUrl: "",
            price: 0,
            score: 1,
          });
        },
        error: (error: unknown) => {
          this.damageError.set(this.claimsApi.getErrorMessage(error));
          this.isSaving.set(false);
        },
      });
  }

  updateDamagePrice(damageId: string, priceValue: string): void {
    const claim = this.claim();
    const price = Number(priceValue);

    if (claim === null || !this.canManageDamages()) {
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      this.damageError.set("Damage price must be greater than 0.");
      return;
    }

    this.isSaving.set(true);
    this.damageError.set(null);

    this.claimsApi
      .updateDamage(claim.id, damageId, { price })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedClaim) => this.applyClaimUpdate(updatedClaim),
        error: (error: unknown) => {
          this.damageError.set(this.claimsApi.getErrorMessage(error));
          this.isSaving.set(false);
        },
      });
  }

  updateDamagePriceFromEvent(damageId: string, event: Event): void {
    const input = event.target;

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.updateDamagePrice(damageId, input.value);
  }

  useFallbackImage(event: Event): void {
    const image = event.target;

    if (!(image instanceof HTMLImageElement)) {
      return;
    }

    if (image.src.endsWith(this.fallbackDamageImageUrl)) {
      return;
    }

    image.src = this.fallbackDamageImageUrl;
  }

  hasDamageImageUrl(imageUrl: string): boolean {
    const trimmedImageUrl = imageUrl.trim();

    if (!trimmedImageUrl) {
      return false;
    }

    try {
      const url = new URL(trimmedImageUrl);

      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  deleteDamage(damageId: string): void {
    const claim = this.claim();

    if (claim === null || !this.canManageDamages()) {
      return;
    }

    this.isSaving.set(true);
    this.damageError.set(null);

    this.claimsApi
      .deleteDamage(claim.id, damageId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedClaim) => this.applyClaimUpdate(updatedClaim),
        error: (error: unknown) => {
          this.damageError.set(this.claimsApi.getErrorMessage(error));
          this.isSaving.set(false);
        },
      });
  }

  private loadClaim(): void {
    const claimId = this.route.snapshot.paramMap.get("id");

    if (claimId === null) {
      this.loadError.set("Claim id is missing.");
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.loadError.set(null);

    this.claimsApi
      .getClaim(claimId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (claim) => {
          this.claim.set(claim);
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          this.loadError.set(this.claimsApi.getErrorMessage(error));
          this.isLoading.set(false);
        },
      });
  }

  private applyClaimUpdate(updatedClaim: ClaimDetail): void {
    this.claim.set(updatedClaim);
    this.isSaving.set(false);
  }

  private toCreateDamageRequest(): CreateDamageRequest {
    const damage = this.damageForm.getRawValue();

    return {
      part: damage.part,
      severity: damage.severity,
      imageUrl: damage.imageUrl,
      price: Number(damage.price),
      score: Number(damage.score),
    };
  }
}

function integerValidator(
  control: AbstractControl<unknown>,
): ValidationErrors | null {
  const value = control.value;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  return Number.isInteger(Number(value)) ? null : { integer: true };
}
