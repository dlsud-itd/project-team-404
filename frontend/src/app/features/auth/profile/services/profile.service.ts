import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { SessionService } from '../../session/session.service';
import type { ChangePasswordRequest, Profile, UpdateProfileRequest } from '../types/profile.types';

/**
 * Reads and updates the signed-in user's profile at /api/auth/profile. A successful update
 * also updates SessionService.currentUser, so the new username shows everywhere at once.
 * The auth interceptor adds the token and handles expired sessions.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly url = `${environment.apiBaseUrl}/api/auth/profile`;

  get(): Observable<Profile> {
    return this.http.get<Profile>(this.url);
  }

  /** PATCH with only the changed fields. */
  update(changes: UpdateProfileRequest): Observable<Profile> {
    return this.http
      .patch<Profile>(this.url, changes)
      .pipe(
        tap(({ username, timezone }) =>
          this.session.updateUser(timezone ? { username, timezone } : { username }),
        ),
      );
  }

  /** Changes the password. The server keeps this session and signs out every other one. */
  changePassword(request: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.url}/password`, request);
  }
}
