import type { Routes } from '@angular/router';

export const SEARCH_ROUTES: Routes = [
  {
    path: '',
    title: 'Search · HabitFlow',
    loadComponent: () => import('./components/search-page/search-page').then((m) => m.SearchPage),
  },
];
