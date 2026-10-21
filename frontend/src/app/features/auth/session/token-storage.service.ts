import { Injectable } from '@angular/core';

export const TOKEN_STORAGE_KEY = 'habittracker.token';

/**
 * Keeps only the session token: in localStorage when the user asks to stay logged in on this
 * device, otherwise in sessionStorage (cleared when the tab closes). Storage can be unavailable
 * (private mode, blocked site data, server rendering), so every access is guarded.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  get(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  save(token: string, remember: boolean): void {
    this.clear();
    try {
      (remember ? localStorage : sessionStorage).setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // The login still succeeds; the session just won't survive a reload.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Nothing could have been stored either.
    }
  }
}
