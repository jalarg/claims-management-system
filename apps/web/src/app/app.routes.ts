import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'claims',
  },
  {
    path: 'claims',
    loadComponent: () => import('./claims/claim-list.component').then((module) => module.ClaimListComponent),
  },
  {
    path: 'claims/:id',
    loadComponent: () => import('./claims/claim-detail.component').then((module) => module.ClaimDetailComponent),
  },
];
