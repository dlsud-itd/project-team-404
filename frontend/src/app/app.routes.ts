import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './features/auth/session/auth.guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'HabitTracker',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'home',
    title: 'Home · HabitTracker',
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
        path: 'settings/profile',
        title: 'Profile · HabitTracker',
        loadComponent: () =>
          import('./features/auth/profile/profile-settings/profile-settings').then(
            (m) => m.ProfileSettings,
          ),
      },
    ],
  },
  {
    path: 'forgot-password',
    title: 'Forgot password · HabitTracker',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    title: 'Reset password · HabitTracker',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'login',
    title: 'Log in · HabitTracker',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Sign up · HabitTracker',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
];
