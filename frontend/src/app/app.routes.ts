import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'register',
    title: 'Sign up · HabitTracker',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
];
