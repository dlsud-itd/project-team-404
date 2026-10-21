import { inject, provideAppInitializer } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

// TODO(Sprint 2): navigate to the user's Inbox once that page exists.
export const POST_LOGIN_REDIRECT = '/home';

/** Lets only signed-in users through; everyone else goes to /login. */
export const authGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  await session.restore();
  return session.isAuthenticated() || router.createUrlTree(['/login']);
};

/** Keeps signed-in users off the login and sign-up pages. */
export const guestGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  await session.restore();
  return !session.isAuthenticated() || router.parseUrl(POST_LOGIN_REDIRECT);
};

/** Starts restoring a stored session at app start without holding up the first render. */
export function provideSessionRestore() {
  return provideAppInitializer(() => {
    void inject(SessionService).restore();
  });
}
