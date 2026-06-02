import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  template: `
    <header class="app-header">
      <a routerLink="/claims">Claims Management</a>
    </header>
    <router-outlet />
  `,
  styles: `
    .app-header {
      border-bottom: 1px solid #e2e8f0;
      background: #fff;
      box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
      padding: 1rem 1.25rem;
    }

    a {
      color: #0f172a;
      font-weight: 800;
      text-decoration: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
