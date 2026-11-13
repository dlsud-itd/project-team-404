import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { SettingsChanges, UserSettings } from '../types/user-settings.types';

/** GET and PATCH /api/settings (Sprint 5 API). */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/settings`;

  /** The user's settings; the server creates the defaults on first read. */
  get(): Observable<UserSettings> {
    return this.http.get<UserSettings>(this.url);
  }

  /** Saves only the given fields and returns every setting. */
  update(changes: SettingsChanges): Observable<UserSettings> {
    return this.http.patch<UserSettings>(this.url, changes);
  }
}
