import { Routes } from '@angular/router';

export const routes: Routes = [
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
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Sign up · HabitTracker',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
];
