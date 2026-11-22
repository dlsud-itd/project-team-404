import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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

/**
 * What to show when saving settings fails. A 400 carries the server's own message
 * (`{ error, details: [{ field, message }] }` from validate-request); anything else gets
 * `fallback`.
 */
export function settingsSaveError(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) return fallback;
  const body = error.error as {
    error?: unknown;
    details?: { message?: unknown }[];
  } | null;
  if (typeof body?.error !== 'string' || !body.error) return fallback;
  const details = (Array.isArray(body.details) ? body.details : [])
    .map((detail) => detail?.message)
    .filter((message): message is string => typeof message === 'string' && !!message);
  return details.length ? `${body.error}: ${details.join('; ')}` : body.error;
}
