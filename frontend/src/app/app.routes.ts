import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './features/auth/session/auth.guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'HabitFlow',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'home',
    title: 'Home · HabitFlow',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    // Signed-in pages outside the home page, which adds the top bar itself. Pages that match
    // none of these fall through to the routes below.
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: 'streak',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      { path: 'dashboard', pathMatch: 'full', redirectTo: 'streak' },
      {
        // Before 'projects' so the projects routes don't claim these URLs.
        path: 'projects/:projectId/tasks',
        loadChildren: () => import('./features/tasks/tasks.routes').then((m) => m.TASKS_ROUTES),
      },
      {
        path: 'projects',
        loadChildren: () =>
          import('./features/projects/projects.routes').then((m) => m.PROJECTS_ROUTES),
      },
      {
        path: 'archive',
        loadChildren: () => import('./features/archive/archive.routes').then((m) => m.ARCHIVE_ROUTES),
      },
      {
        path: 'search',
        loadChildren: () => import('./features/search/search.routes').then((m) => m.SEARCH_ROUTES),
      },
      {
        // Profile, Preferences, Config, Labels and Priorities tabs; /settings/profile is unchanged.
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
    ],
  },
  {
    path: 'forgot-password',
    title: 'Forgot password · HabitFlow',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    title: 'Reset password · HabitFlow',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'login',
    title: 'Log in · HabitFlow',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Sign up · HabitFlow',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
];
