import { DOCUMENT } from '@angular/common';
import {
  Injectable,
  Injector,
  computed,
  effect,
  inject,
  provideEnvironmentInitializer,
  signal,
  untracked,
} from '@angular/core';
import { Observable, tap } from 'rxjs';
import { SessionService } from '../../auth/session/session.service';
import { TokenStorageService } from '../../auth/session/token-storage.service';
import { SettingsService } from '../services/settings.service';
import {
  DASHBOARD_LIMIT_MAX,
  DASHBOARD_LIMIT_MIN,
  DEFAULT_SETTINGS,
  FONT_FAMILIES,
  FONT_SIZES,
  isFontFamily,
  isFontSize,
  type Appearance,
  type SettingsChanges,
  type UserSettings,
} from '../types/user-settings.types';

/** Where the last known settings are kept, so a reload shows the right font from the start. */
export const SETTINGS_CACHE_KEY = 'habittracker.settings';

/** The CSS custom properties on <html> that styles.scss reads. */
export const FONT_SIZE_PROPERTY = '--app-font-size';
export const FONT_FAMILY_PROPERTY = '--app-font-family';

/**
 * The signed-in user's settings: dashboard limits and the app's font. It applies the font to the
 * page as soon as it is created (from the cache), and again whenever the settings or a preview
 * change.
 */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly document = inject(DOCUMENT);
  // Fetched on first use, so views that only read limits don't need HttpClient.
  private readonly injector = inject(Injector);

  private readonly current = signal<UserSettings>(readCache() ?? DEFAULT_SETTINGS);
  /** An unsaved font choice shown while Preferences is open; null shows the saved one. */
  private readonly preview = signal<Appearance | null>(null);

  readonly settings = this.current.asReadonly();
  /** True once the server's settings have arrived in this session. */
  readonly loaded = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly taskLimit = computed(() => this.current().dashboardTaskLimit);
  readonly projectLimit = computed(() => this.current().dashboardProjectLimit);
  /** What the page shows right now: the preview, else the saved settings. */
  readonly appearance = computed<Appearance>(() => {
    const { fontSize, fontFamily } = this.current();
    return this.preview() ?? { fontSize, fontFamily };
  });

  constructor() {
    // Apply at once rather than waiting for the first effect run, so there is no flash.
    applyAppearance(this.document, this.appearance());
    effect(() => applyAppearance(this.document, this.appearance()));
  }

  /** Fetches the settings. On failure the current ones stay and `error` says why. */
  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.injector
      .get(SettingsService)
      .get()
      .subscribe({
        next: (settings) => {
          this.set(settings);
          this.loaded.set(true);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set("Couldn't load your settings.");
        },
      });
  }

  /** Saves changes; the saved values replace any preview. */
  save(changes: SettingsChanges): Observable<UserSettings> {
    return this.injector
      .get(SettingsService)
      .update(changes)
      .pipe(
        tap((settings) => {
          this.set(settings);
          this.loaded.set(true);
          this.preview.set(null);
        }),
      );
  }

  /** Shows a font choice on the page without saving it. */
  previewAppearance(appearance: Appearance): void {
    this.preview.set(appearance);
  }

  /** Drops an unsaved font choice, going back to the saved one. */
  cancelPreview(): void {
    this.preview.set(null);
  }

  /** Forgets the user's settings, for sign-out. */
  clear(): void {
    removeCache();
    this.current.set(DEFAULT_SETTINGS);
    this.preview.set(null);
    this.loaded.set(false);
    this.loading.set(false);
    this.error.set(null);
  }

  private set(settings: UserSettings): void {
    const clean = sanitize(settings);
    this.current.set(clean);
    writeCache(clean);
  }
}

/**
 * Loads the settings right after the session is restored and on every sign-in, and clears them
 * (and the cache) on sign-out. With no stored token, cached settings are dropped at start-up.
 */
export function provideUserSettings() {
  return provideEnvironmentInitializer(() => {
    const store = inject(SettingsStore);
    const session = inject(SessionService);
    const tokens = inject(TokenStorageService);
    if (!tokens.get()) store.clear();

    let previousUserId: string | null = null;
    effect(() => {
      const userId = session.currentUser()?.id ?? null;
      untracked(() => {
        if (userId && userId !== previousUserId) store.load();
        else if (!userId && previousUserId) store.clear();
        previousUserId = userId;
      });
    });
    // A rejected token ends the session during restore without a sign-out to react to.
    void session.restore().then(() => {
      if (!tokens.get()) store.clear();
    });
  });
}

/** Sets the font custom properties on <html>. */
export function applyAppearance(document: Document, { fontSize, fontFamily }: Appearance): void {
  const root = document.documentElement;
  const size = FONT_SIZES.find((option) => option.value === fontSize) ?? FONT_SIZES[1];
  const family = FONT_FAMILIES.find((option) => option.value === fontFamily) ?? FONT_FAMILIES[0];
  root.style.setProperty(FONT_SIZE_PROPERTY, size.css);
  root.style.setProperty(FONT_FAMILY_PROPERTY, family.css);
}

/** Keeps only known values, so a bad cache or reply can't break the page. */
function sanitize(value: Partial<UserSettings>): UserSettings {
  const limit = (raw: unknown, fallback: number) =>
    typeof raw === 'number' &&
    Number.isInteger(raw) &&
    raw >= DASHBOARD_LIMIT_MIN &&
    raw <= DASHBOARD_LIMIT_MAX
      ? raw
      : fallback;
  return {
    dashboardTaskLimit: limit(value.dashboardTaskLimit, DEFAULT_SETTINGS.dashboardTaskLimit),
    dashboardProjectLimit: limit(
      value.dashboardProjectLimit,
      DEFAULT_SETTINGS.dashboardProjectLimit,
    ),
    fontSize: isFontSize(value.fontSize) ? value.fontSize : DEFAULT_SETTINGS.fontSize,
    fontFamily: isFontFamily(value.fontFamily) ? value.fontFamily : DEFAULT_SETTINGS.fontFamily,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
  };
}

// Storage can be unavailable (private mode, blocked site data), so every access is guarded.
function readCache(): UserSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    return raw ? sanitize(JSON.parse(raw) as Partial<UserSettings>) : null;
  } catch {
    return null;
  }
}

function writeCache(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {
    // The settings still apply; they just won't be ready before the next load.
  }
}

function removeCache(): void {
  try {
    localStorage.removeItem(SETTINGS_CACHE_KEY);
  } catch {
    // Nothing could have been stored either.
  }
}
