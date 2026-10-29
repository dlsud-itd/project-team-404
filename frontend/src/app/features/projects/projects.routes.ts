import type { Routes } from '@angular/router';

/** Lazy-loaded under /projects; app.routes.ts puts authGuard in front of all of these. */
export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    title: 'Projects · HabitTracker',
    loadComponent: () =>
      import('./project-crud/project-list/project-list').then((m) => m.ProjectList),
  },
  {
    path: 'new',
    title: 'New project · HabitTracker',
    data: { mode: 'create' },
    loadComponent: () =>
      import('./project-crud/project-form/project-form').then((m) => m.ProjectForm),
  },
  {
    path: 'organize',
    title: 'Organize projects · HabitTracker',
    loadComponent: () =>
      import('./project-organization/project-switcher/project-switcher').then(
        (m) => m.ProjectSwitcher,
      ),
  },
  {
    path: ':projectId/edit',
    title: 'Edit project · HabitTracker',
    data: { mode: 'edit' },
    loadComponent: () =>
      import('./project-crud/project-form/project-form').then((m) => m.ProjectForm),
  },
];
