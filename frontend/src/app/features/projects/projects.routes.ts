import type { Routes } from '@angular/router';

/** Lazy-loaded under /projects; app.routes.ts puts authGuard in front of all of these. */
export const PROJECTS_ROUTES: Routes = [
  // The list and the organize view live in the Projects tab of the home page.
  { path: '', pathMatch: 'full', redirectTo: '/home?tab=projects' },
  { path: 'organize', pathMatch: 'full', redirectTo: '/home?tab=projects&view=organize' },
  // New projects are made in a popup on that tab.
  { path: 'new', pathMatch: 'full', redirectTo: '/home?tab=projects' },
  {
    path: ':projectId/edit',
    title: 'Edit project · HabitTracker',
    data: { mode: 'edit' },
    loadComponent: () =>
      import('./project-crud/project-form/project-form').then((m) => m.ProjectForm),
  },
];
