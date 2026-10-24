import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { SKIP_SESSION_EXPIRY } from '../../session/session-context';
import { TokenStorageService } from '../../session/token-storage.service';
import type { LoginRequest, LoginResponse } from '../types/login.types';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStorageService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/auth`;

  /**
   * Logs in and saves only the session token, on this device when `remember` is set.
   * A 401 here means wrong credentials, not an expired session.
   */
  login(request: LoginRequest, remember: boolean): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, request, {
        context: new HttpContext().set(SKIP_SESSION_EXPIRY, true),
      })
      .pipe(tap(({ token }) => this.tokens.save(token, remember)));
  }
}
