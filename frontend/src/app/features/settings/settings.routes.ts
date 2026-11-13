import type { Routes } from '@angular/router';
import { SettingsLayout } from './components/settings-layout/settings-layout';

/** Lazy-loaded under /settings; app.routes.ts puts authGuard and the app shell in front. */
export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    component: SettingsLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'profile' },
      {
        path: 'profile',
        title: 'Profile · HabitTracker',
        loadComponent: () =>
          import('../auth/profile/profile-settings/profile-settings').then(
            (m) => m.ProfileSettings,
          ),
      },
      {
        path: 'preferences',
        title: 'Preferences · HabitTracker',
        data: {
          heading: 'Preferences',
          description: 'Font size and font choices will be set here soon.',
        },
        loadComponent: () =>
          import('./components/settings-placeholder/settings-placeholder').then(
            (m) => m.SettingsPlaceholder,
          ),
      },
      {
        path: 'config',
        title: 'Config · HabitTracker',
        data: {
          heading: 'Config',
          description: 'How many tasks and projects the dashboard shows will be set here soon.',
        },
        loadComponent: () =>
          import('./components/settings-placeholder/settings-placeholder').then(
            (m) => m.SettingsPlaceholder,
          ),
      },
      {
        path: 'labels',
        title: 'Labels · HabitTracker',
        loadComponent: () => import('./labels/label-settings').then((m) => m.LabelSettings),
      },
      {
        path: 'priorities',
        title: 'Priorities · HabitTracker',
        loadComponent: () =>
          import('./priorities/priority-settings').then((m) => m.PrioritySettings),
      },
    ],
  },
];
