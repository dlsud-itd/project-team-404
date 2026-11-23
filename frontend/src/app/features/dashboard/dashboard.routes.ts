import type { Routes } from '@angular/router';

/** Lazy-loaded under /streak (/dashboard redirects there); app.routes.ts puts authGuard in front of all of these. */
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    title: 'Streak · HabitFlow',
    loadComponent: () => import('./dashboard-page/dashboard-page').then((m) => m.DashboardPage),
  },
];
