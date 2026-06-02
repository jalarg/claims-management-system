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
import { RouterLink } from "@angular/router";

import { ClaimsApiService } from "./claims-api.service";
import type { ClaimStatus, ClaimSummary } from "./claims-api.types";

@Component({
  selector: "app-claim-list",
  imports: [RouterLink],
  template: `
    <main class="page">
      <header class="page-header">
        <h2>Claim List</h2>
      </header>

      <section class="filter-card" aria-label="Claim filters">
        <label>
          Status
          <select
            [value]="selectedStatus() ?? ''"
            (change)="filterByStatusFromEvent($event)"
          >
            @for (option of statusFilterOptions; track option.label) {
              <option [value]="option.status ?? ''">{{ option.label }}</option>
            }
          </select>
        </label>
      </section>

      @if (isLoading()) {
        <p class="notice">Loading claims...</p>
      } @else if (errorMessage()) {
        <p class="notice error" role="alert">{{ errorMessage() }}</p>
      } @else {
        <section class="card" aria-label="Claims">
          @if (claims().length > 0) {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Claim</th>
                    <th scope="col">Status</th>
                    <th scope="col" class="amount-heading">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  @for (claim of claims(); track claim.id) {
                    <tr>
                      <td>
                        <a
                          class="claim-link"
                          [routerLink]="['/claims', claim.id]"
                        >
                          {{ claim.title }}
                        </a>
                        <small>{{ claim.description }}</small>
                      </td>
                      <td>
                        <span [class]="statusBadgeClass(claim.status)">
                          {{ statusLabel(claim.status) }}
                        </span>
                      </td>
                      <td class="amount">
                        {{ formatAmount(claim.totalAmount) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <footer class="summary">
              Total listed amount: {{ formatAmount(totalListedAmount()) }}
            </footer>
          } @else {
            <p class="notice">{{ emptyMessage() }}</p>
          }
        </section>
      }
    </main>
  `,
  styles: `
    .page {
      max-width: 58rem;
      margin: 0 auto;
      padding: 2rem 1.25rem;
    }

    .page-header {
      margin-bottom: 1.5rem;
    }

    h2 {
      margin: 0;
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      letter-spacing: -0.03em;
    }

    .filter-card {
      margin-bottom: 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      background: #fff;
      padding: 1.1rem 1.25rem;
      box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
    }

    label {
      display: grid;
      gap: 0.35rem;
      max-width: 14rem;
      color: #334155;
      font-weight: 700;
    }

    select {
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font: inherit;
      padding: 0.55rem 0.7rem;
    }

    select:focus-visible,
    .claim-link:focus-visible {
      outline: 3px solid rgb(37 99 235 / 0.25);
      outline-offset: 2px;
    }

    .card {
      overflow: hidden;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      background: #fff;
      box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
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
      padding: 0.9rem 1rem;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    th {
      color: #475569;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    tbody tr:hover {
      background: #f8fafc;
    }

    .claim-link {
      color: #2563eb;
      font-weight: 700;
      text-decoration: none;
    }

    .claim-link:hover {
      text-decoration: underline;
    }

    small {
      display: block;
      margin-top: 0.25rem;
    }

    small,
    .amount,
    .notice {
      color: #475569;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      border: 1px solid transparent;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      padding: 0.25rem 0.55rem;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .status-pending {
      border-color: #bfdbfe;
      background: #eff6ff;
      color: #1d4ed8;
    }

    .status-in-review {
      border-color: #fde68a;
      background: #fffbeb;
      color: #92400e;
    }

    .status-finished {
      border-color: #bbf7d0;
      background: #f0fdf4;
      color: #166534;
    }

    .status-canceled {
      border-color: #fecaca;
      background: #fef2f2;
      color: #991b1b;
    }

    .amount-heading,
    .amount {
      text-align: right;
      font-weight: 700;
    }

    .summary {
      padding: 0.9rem 1rem;
      color: #334155;
      font-weight: 700;
      text-align: right;
      background: #f8fafc;
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

  readonly statusFilterOptions: readonly {
    label: string;
    status: ClaimStatus | null;
  }[] = [
    { label: "All", status: null },
    { label: "Pending", status: "PENDING" },
    { label: "In review", status: "IN_REVIEW" },
    { label: "Finished", status: "FINISHED" },
    { label: "Canceled", status: "CANCELED" },
  ];

  readonly claims = signal<ClaimSummary[]>([]);
  readonly selectedStatus = signal<ClaimStatus | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly emptyMessage = computed(() =>
    this.selectedStatus() === null
      ? "No claims found."
      : "No claims found for this status.",
  );
  readonly totalListedAmount = computed(() =>
    this.claims().reduce((total, claim) => total + claim.totalAmount, 0),
  );

  ngOnInit(): void {
    this.loadClaims();
  }

  filterByStatusFromEvent(event: Event): void {
    const select = event.target;

    if (!(select instanceof HTMLSelectElement)) {
      return;
    }

    this.selectedStatus.set(toClaimStatusFilter(select.value));
    this.loadClaims();
  }

  private loadClaims(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const selectedStatus = this.selectedStatus();
    const claims$ = selectedStatus
      ? this.claimsApi.getClaims(selectedStatus)
      : this.claimsApi.getClaims();

    claims$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

  formatAmount(amount: number): string {
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  statusLabel(status: ClaimStatus): string {
    return status === "IN_REVIEW" ? "In review" : status.toLowerCase();
  }

  statusBadgeClass(status: ClaimStatus): string {
    const statusClassByStatus: Record<ClaimStatus, string> = {
      PENDING: "status-pending",
      IN_REVIEW: "status-in-review",
      FINISHED: "status-finished",
      CANCELED: "status-canceled",
    };

    return `status-badge ${statusClassByStatus[status]}`;
  }
}

function toClaimStatusFilter(value: string): ClaimStatus | null {
  if (
    value === "PENDING" ||
    value === "IN_REVIEW" ||
    value === "FINISHED" ||
    value === "CANCELED"
  ) {
    return value;
  }

  return null;
}
