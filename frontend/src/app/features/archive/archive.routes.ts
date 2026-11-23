import type { Routes } from '@angular/router';

export const ARCHIVE_ROUTES: Routes = [
  {
    path: '',
    title: 'Archive · HabitFlow',
    loadComponent: () =>
      import('./components/archive-page/archive-page').then((m) => m.ArchivePage),
  },
];
