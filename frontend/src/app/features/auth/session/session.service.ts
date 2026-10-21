import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, firstValueFrom, map, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LoginService } from '../login/services/login.service';
import type { LoginRequest, LoginResponse, LoginUser } from '../login/types/login.types';
import { SKIP_SESSION_EXPIRY } from './session-context';
import { TokenStorageService } from './token-storage.service';

export type SessionUser = LoginUser;

// These calls handle their own 401s, so the interceptor must not redirect for them.
const OWN_401_HANDLING = { context: new HttpContext().set(SKIP_SESSION_EXPIRY, true) };

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStorageService);
  private readonly loginService = inject(LoginService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/auth`;
  private restoring?: Promise<void>;

  private readonly user = signal<SessionUser | null>(null);
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  login(request: LoginRequest, remember: boolean): Observable<LoginResponse> {
    return this.loginService.login(request, remember).pipe(tap(({ user }) => this.user.set(user)));
  }

  /**
   * Loads the user for a stored token from GET /api/auth/me. Runs once per app start; guards
   * await it so they never decide before the session is known. Never rejects.
   */
  restore(): Promise<void> {
    this.restoring ??= this.loadCurrentUser();
    return this.restoring;
  }

  /** Ends the session on the server, then locally even if the server call fails. */
  logout(): Observable<void> {
    return this.http.post(`${this.baseUrl}/logout`, null, OWN_401_HANDLING).pipe(
      catchError(() => of(null)),
      map(() => this.clear()),
    );
  }

  clear(): void {
    this.tokens.clear();
    this.user.set(null);
  }

  private async loadCurrentUser(): Promise<void> {
    if (!this.tokens.get()) return;
    try {
      this.user.set(
        await firstValueFrom(this.http.get<SessionUser>(`${this.baseUrl}/me`, OWN_401_HANDLING)),
      );
    } catch (error) {
      // Only a rejected token ends the session; a network error keeps it for the next start.
      if (error instanceof HttpErrorResponse && error.status === 401) this.clear();
    }
  }
}
