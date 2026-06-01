import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home.component').then((module) => module.HomeComponent),
  },
];
