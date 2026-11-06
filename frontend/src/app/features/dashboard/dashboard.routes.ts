import type { Routes } from '@angular/router';

/** Lazy-loaded under /dashboard; app.routes.ts puts authGuard in front of all of these. */
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    title: 'Dashboard · HabitTracker',
    loadComponent: () => import('./dashboard-page/dashboard-page').then((m) => m.DashboardPage),
  },
];
