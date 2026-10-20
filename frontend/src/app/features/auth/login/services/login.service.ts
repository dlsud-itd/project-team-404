import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type { LoginRequest, LoginResponse } from '../types/login.types';

export const TOKEN_STORAGE_KEY = 'habittracker.token';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/auth`;

  /**
   * Logs in and saves only the session token: in localStorage when the user asks to stay
   * logged in on this device, otherwise in sessionStorage (cleared when the tab closes).
   * Temporary until session/token-storage.service.ts takes over token handling.
   */
  login(request: LoginRequest, remember: boolean): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, request)
      .pipe(tap(({ token }) => this.saveToken(token, remember)));
  }

  private saveToken(token: string, remember: boolean): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      (remember ? localStorage : sessionStorage).setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // Storage can be unavailable (private mode, blocked site data). The login still succeeds.
    }
  }
}
