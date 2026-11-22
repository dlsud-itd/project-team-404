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
        loadComponent: () =>
          import('./preferences/preferences-settings').then((m) => m.PreferencesSettings),
      },
      {
        path: 'config',
        title: 'Config · HabitTracker',
        loadComponent: () => import('./config/config-settings').then((m) => m.ConfigSettings),
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
