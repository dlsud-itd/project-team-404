import type { Routes } from '@angular/router';

/** Lazy-loaded under /labels; app.routes.ts puts authGuard in front of all of these. */
export const LABELS_ROUTES: Routes = [
  {
    path: '',
    title: 'Labels · HabitTracker',
    loadComponent: () => import('./label-list/label-list').then((m) => m.LabelList),
  },
  {
    path: 'new',
    title: 'New label · HabitTracker',
    data: { mode: 'create' },
    loadComponent: () => import('./label-form/label-form').then((m) => m.LabelForm),
  },
  {
    path: ':labelId/edit',
    title: 'Edit label · HabitTracker',
    data: { mode: 'edit' },
    loadComponent: () => import('./label-form/label-form').then((m) => m.LabelForm),
  },
];
