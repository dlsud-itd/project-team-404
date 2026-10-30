import type { Routes } from '@angular/router';

/**
 * Lazy-loaded under /projects/:projectId/tasks; app.routes.ts puts authGuard in front of all of
 * these. The parent route has no component, so :projectId is inherited by every child.
 */
export const TASKS_ROUTES: Routes = [
  {
    path: '',
    title: 'Tasks · HabitTracker',
    loadComponent: () => import('./task-crud/task-list/task-list').then((m) => m.TaskList),
  },
  {
    path: 'new',
    title: 'New task · HabitTracker',
    data: { mode: 'create' },
    loadComponent: () => import('./task-crud/task-form/task-form').then((m) => m.TaskForm),
  },
  {
    path: ':taskId/edit',
    title: 'Edit task · HabitTracker',
    data: { mode: 'edit' },
    loadComponent: () => import('./task-crud/task-form/task-form').then((m) => m.TaskForm),
  },
];
