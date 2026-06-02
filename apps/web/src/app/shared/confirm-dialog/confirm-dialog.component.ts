import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { ConfirmDialogService } from "./confirm-dialog.service";

@Component({
  selector: "app-confirm-dialog",
  template: `
    @if (dialog(); as dialog) {
      <div class="backdrop" (click)="cancel()">
        <section
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
          (click)="$event.stopPropagation()"
        >
          <h2 id="confirm-dialog-title">{{ dialog.title }}</h2>
          <p id="confirm-dialog-message">{{ dialog.message }}</p>

          <div class="actions">
            <button type="button" class="secondary" (click)="cancel()">
              {{ dialog.cancelLabel }}
            </button>
            <button
              type="button"
              class="primary"
              [class.danger]="dialog.variant === 'danger'"
              (click)="confirm()"
            >
              {{ dialog.confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: rgb(15 23 42 / 0.45);
    }

    .dialog {
      width: min(100%, 28rem);
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      background: #fff;
      box-shadow: 0 1.5rem 4rem rgb(15 23 42 / 0.25);
      padding: 1.5rem;
    }

    h2,
    p {
      margin-top: 0;
    }

    h2 {
      margin-bottom: 0.5rem;
      color: #0f172a;
      font-size: 1.25rem;
      letter-spacing: -0.02em;
    }

    p {
      margin-bottom: 1.25rem;
      color: #475569;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    button {
      border: 1px solid #2563eb;
      border-radius: 999px;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      padding: 0.6rem 0.9rem;
    }

    button:focus-visible {
      outline: 3px solid rgb(37 99 235 / 0.25);
      outline-offset: 2px;
    }

    .primary {
      background: #2563eb;
      color: #fff;
    }

    .primary.danger {
      border-color: #b91c1c;
      background: #b91c1c;
    }

    .secondary {
      background: #fff;
      color: #2563eb;
    }
  `,
  host: {
    "(document:keydown.escape)": "cancel()",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly dialog = this.confirmDialog.dialog;

  cancel(): void {
    this.confirmDialog.cancel();
  }

  confirm(): void {
    this.confirmDialog.confirmCurrent();
  }
}
