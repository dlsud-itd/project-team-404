import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SKIP_SESSION_EXPIRY } from './session-context';
import { SessionService } from './session.service';
import { TokenStorageService } from './token-storage.service';

/**
 * Sends the session token with every API call. A 401 from the API means the session was
 * revoked or expired, so it is cleared and the user is sent back to /login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) return next(req);

  const token = inject(TokenStorageService).get();
  const session = inject(SessionService);
  const router = inject(Router);
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.context.get(SKIP_SESSION_EXPIRY)
      ) {
        session.clear();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
