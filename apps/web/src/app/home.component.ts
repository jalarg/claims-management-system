import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule],
  template: `
    <main class="shell">
      <section class="card">
        <p class="eyebrow">Stage 2 foundation</p>
        <h1>Claims Management System</h1>
        <p>
          Angular routing and reactive forms are available. Claim UI will be implemented in a later stage.
        </p>
        <label>
          Reactive forms smoke field
          <input type="text" [formControl]="smokeControl" aria-label="Reactive forms smoke field" />
        </label>
      </section>
    </main>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 2rem;
      }

      .card {
        width: min(100%, 42rem);
        padding: 2rem;
        border: 1px solid #e2e8f0;
        border-radius: 1.25rem;
        background: #ffffff;
        box-shadow: 0 24px 80px rgb(15 23 42 / 12%);
      }

      .eyebrow {
        margin: 0 0 0.5rem;
        color: #2563eb;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0 0 1rem;
        font-size: clamp(2rem, 6vw, 4rem);
        line-height: 1;
      }

      p {
        color: #475569;
      }

      label {
        display: grid;
        gap: 0.5rem;
        margin-top: 1.5rem;
        font-weight: 600;
      }

      input {
        border: 1px solid #cbd5e1;
        border-radius: 0.75rem;
        padding: 0.75rem 1rem;
        font: inherit;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly smokeControl = new FormControl('', { nonNullable: true });
}
