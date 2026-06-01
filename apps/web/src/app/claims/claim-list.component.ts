import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { ClaimsApiService } from './claims-api.service';
import type { ClaimSummary } from './claims-api.types';

@Component({
  selector: 'app-claim-list',
  imports: [RouterLink],
  template: `
    <main class="page">
      <header class="page-header">
        <p class="eyebrow">Claims</p>
        <h1>Claim List</h1>
      </header>

      @if (isLoading()) {
        <p class="notice">Loading claims...</p>
      } @else if (errorMessage()) {
        <p class="notice error" role="alert">{{ errorMessage() }}</p>
      } @else {
        <section class="card" aria-label="Claims">
          @for (claim of claims(); track claim.id) {
            <a class="claim-row" [routerLink]="['/claims', claim.id]">
              <span>
                <strong>{{ claim.title }}</strong>
                <small>{{ claim.status }}</small>
              </span>
              <span class="amount">{{ claim.totalAmount }}</span>
            </a>
          } @empty {
            <p class="notice">No claims found.</p>
          }
        </section>
      }
    </main>
  `,
  styles: `
    .page {
      max-width: 58rem;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      margin-bottom: 1.5rem;
    }

    .eyebrow {
      margin: 0 0 0.25rem;
      color: #2563eb;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: clamp(2rem, 5vw, 3.5rem);
      line-height: 1;
    }

    .card {
      overflow: hidden;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      background: #fff;
    }

    .claim-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem;
      color: inherit;
      text-decoration: none;
      border-bottom: 1px solid #e2e8f0;
    }

    .claim-row:last-child {
      border-bottom: 0;
    }

    .claim-row:hover,
    .claim-row:focus-visible {
      background: #eff6ff;
      outline: none;
    }

    strong,
    small {
      display: block;
    }

    small,
    .amount,
    .notice {
      color: #475569;
    }

    .amount {
      font-weight: 700;
    }

    .error {
      color: #b91c1c;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClaimListComponent implements OnInit {
  private readonly claimsApi = inject(ClaimsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly claims = signal<ClaimSummary[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadClaims();
  }

  private loadClaims(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.claimsApi
      .getClaims()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (claims) => {
          this.claims.set(claims);
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.claimsApi.getErrorMessage(error));
          this.isLoading.set(false);
        },
      });
  }
}
