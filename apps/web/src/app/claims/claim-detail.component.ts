import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ClaimsApiService } from './claims-api.service';
import type { ClaimDetail, ClaimStatus } from './claims-api.types';

@Component({
  selector: 'app-claim-detail',
  imports: [RouterLink],
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
          <p class="total">Total: {{ claim.totalAmount }}</p>
        </header>

        <section class="actions" aria-label="Status transition actions">
          @for (status of transitionStatuses; track status) {
            <button type="button" (click)="transitionTo(status)" [disabled]="isSaving() || claim.status === status">
              Move to {{ status }}
            </button>
          }
        </section>

        @if (transitionError()) {
          <p class="notice error" role="alert">{{ transitionError() }}</p>
        }

        <section class="card" aria-labelledby="damage-heading">
          <h2 id="damage-heading">Damages</h2>

          @if (hasDamages()) {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Part</th>
                    <th scope="col">Severity</th>
                    <th scope="col">Score</th>
                    <th scope="col">Price</th>
                    <th scope="col">Image</th>
                  </tr>
                </thead>
                <tbody>
                  @for (damage of claim.damages; track damage.id) {
                    <tr>
                      <td>{{ damage.part }}</td>
                      <td>{{ damage.severity }}</td>
                      <td>{{ damage.score }}</td>
                      <td>{{ damage.price }}</td>
                      <td><a [href]="damage.imageUrl" target="_blank" rel="noreferrer">Open image</a></td>
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
    }

    th,
    td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    th {
      color: #475569;
      font-size: 0.8rem;
      text-transform: uppercase;
    }

    .notice {
      color: #475569;
    }

    .error {
      color: #b91c1c;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClaimDetailComponent implements OnInit {
  private readonly claimsApi = inject(ClaimsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly transitionStatuses: readonly ClaimStatus[] = ['IN_REVIEW', 'FINISHED', 'CANCELED'];
  readonly claim = signal<ClaimDetail | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly transitionError = signal<string | null>(null);
  readonly hasDamages = computed(() => (this.claim()?.damages.length ?? 0) > 0);

  ngOnInit(): void {
    this.loadClaim();
  }

  transitionTo(status: ClaimStatus): void {
    const claim = this.claim();

    if (claim === null) {
      return;
    }

    this.isSaving.set(true);
    this.transitionError.set(null);

    this.claimsApi
      .updateClaimStatus(claim.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedClaim) => {
          this.claim.set(updatedClaim);
          this.isSaving.set(false);
        },
        error: (error: unknown) => {
          this.transitionError.set(this.claimsApi.getErrorMessage(error));
          this.isSaving.set(false);
        },
      });
  }

  private loadClaim(): void {
    const claimId = this.route.snapshot.paramMap.get('id');

    if (claimId === null) {
      this.loadError.set('Claim id is missing.');
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
}
