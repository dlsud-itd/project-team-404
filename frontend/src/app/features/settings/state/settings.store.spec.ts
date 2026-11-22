import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { SessionService, type SessionUser } from '../../auth/session/session.service';
import { TOKEN_STORAGE_KEY } from '../../auth/session/token-storage.service';
import { DEFAULT_SETTINGS, type UserSettings } from '../types/user-settings.types';
import {
  FONT_FAMILY_PROPERTY,
  FONT_SIZE_PROPERTY,
  SETTINGS_CACHE_KEY,
  SettingsStore,
  provideUserSettings,
} from './settings.store';

const URL = `${environment.apiBaseUrl}/api/settings`;

const SAVED: UserSettings = {
  dashboardTaskLimit: 8,
  dashboardProjectLimit: 3,
  fontSize: 'large',
  fontFamily: 'atkinson-hyperlegible',
  updatedAt: '2026-11-10T09:35:00.000Z',
};

const USER: SessionUser = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 1,
};

const rootStyle = (name: string) => document.documentElement.style.getPropertyValue(name);
const cached = () => JSON.parse(localStorage.getItem(SETTINGS_CACHE_KEY) ?? 'null') as unknown;

function resetPage(): void {
  localStorage.clear();
  sessionStorage.clear();
  document.documentElement.style.removeProperty(FONT_SIZE_PROPERTY);
  document.documentElement.style.removeProperty(FONT_FAMILY_PROPERTY);
}

describe('SettingsStore', () => {
  let http: HttpTestingController;

  function createStore(): SettingsStore {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(SettingsStore);
  }

  beforeEach(resetPage);
  afterEach(() => {
    http.verify();
    resetPage();
  });

  it('starts from the defaults and applies them to <html> at once', () => {
    const store = createStore();

    expect(store.settings()).toEqual(DEFAULT_SETTINGS);
    expect(store.taskLimit()).toBe(5);
    expect(store.projectLimit()).toBe(5);
    expect(store.loaded()).toBe(false);
    // Applied in the constructor, before any effect has run.
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('100%');
    expect(rootStyle(FONT_FAMILY_PROPERTY)).toContain('Archivo');
  });

  it('starts from the cache so the saved font shows from the first paint', () => {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(SAVED));
    const store = createStore();

    expect(store.settings()).toEqual(SAVED);
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('112.5%');
    expect(rootStyle(FONT_FAMILY_PROPERTY)).toContain('Atkinson Hyperlegible');
  });

  it('ignores a broken cache or values it doesn’t know', () => {
    localStorage.setItem(SETTINGS_CACHE_KEY, '{not json');
    expect(createStore().settings()).toEqual(DEFAULT_SETTINGS);

    TestBed.resetTestingModule();
    localStorage.setItem(
      SETTINGS_CACHE_KEY,
      JSON.stringify({ dashboardTaskLimit: 500, fontSize: 'huge', fontFamily: 'serif' }),
    );
    expect(createStore().settings()).toEqual({ ...DEFAULT_SETTINGS, fontFamily: 'serif' });
  });

  it('loads the settings, applies them and caches them', () => {
    const store = createStore();
    store.load();
    expect(store.loading()).toBe(true);

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('GET');
    req.flush(SAVED);
    TestBed.tick();

    expect(store.loading()).toBe(false);
    expect(store.loaded()).toBe(true);
    expect(store.settings()).toEqual(SAVED);
    expect(store.taskLimit()).toBe(8);
    expect(cached()).toEqual(SAVED);
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('112.5%');
  });

  it('keeps the current settings and reports an error when loading fails', () => {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(SAVED));
    const store = createStore();
    store.load();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });

    expect(store.loaded()).toBe(false);
    expect(store.error()).toBe("Couldn't load your settings.");
    expect(store.settings()).toEqual(SAVED);
  });

  it('saves changes and caches what the server returns', () => {
    const store = createStore();
    let result: UserSettings | undefined;
    store.save({ dashboardTaskLimit: 8 }).subscribe((settings) => (result = settings));

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ dashboardTaskLimit: 8 });
    req.flush({ ...DEFAULT_SETTINGS, dashboardTaskLimit: 8, updatedAt: SAVED.updatedAt });

    expect(result?.dashboardTaskLimit).toBe(8);
    expect(store.taskLimit()).toBe(8);
    expect(store.loaded()).toBe(true);
    expect(cached()).toMatchObject({ dashboardTaskLimit: 8 });
  });

  it('previews a font on the page without saving, and cancels back to the saved one', () => {
    const store = createStore();
    store.previewAppearance({ fontSize: 'x-large', fontFamily: 'monospace' });
    TestBed.tick();

    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('125%');
    expect(rootStyle(FONT_FAMILY_PROPERTY)).toContain('monospace');
    expect(store.settings().fontSize).toBe('medium');
    expect(localStorage.getItem(SETTINGS_CACHE_KEY)).toBeNull();

    store.cancelPreview();
    TestBed.tick();
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('100%');
    expect(rootStyle(FONT_FAMILY_PROPERTY)).toContain('Archivo');
  });

  it('replaces the preview with what was saved', () => {
    const store = createStore();
    store.previewAppearance({ fontSize: 'small', fontFamily: 'serif' });
    store.save({ fontSize: 'small', fontFamily: 'serif' }).subscribe();
    http.expectOne(URL).flush({ ...DEFAULT_SETTINGS, fontSize: 'small', fontFamily: 'serif' });

    store.cancelPreview();
    TestBed.tick();
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('87.5%');
    expect(rootStyle(FONT_FAMILY_PROPERTY)).toContain('Georgia');
  });

  it('forgets everything on clear', () => {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(SAVED));
    const store = createStore();
    store.clear();
    TestBed.tick();

    expect(store.settings()).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem(SETTINGS_CACHE_KEY)).toBeNull();
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('100%');
  });
});

describe('provideUserSettings', () => {
  let http: HttpTestingController;
  let currentUser: ReturnType<typeof signal<SessionUser | null>>;
  let restored: () => void;

  function start(): SettingsStore {
    currentUser = signal<SessionUser | null>(null);
    const restoring = new Promise<void>((resolve) => (restored = resolve));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: { currentUser, restore: () => restoring } },
        provideUserSettings(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(SettingsStore);
    TestBed.tick();
    return store;
  }

  beforeEach(resetPage);
  afterEach(() => {
    http.verify();
    resetPage();
  });

  it('keeps the cached settings while the session is restored, then loads fresh ones', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token');
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(SAVED));
    const store = start();

    expect(store.settings()).toEqual(SAVED);
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('112.5%');
    http.expectNone(URL);

    currentUser.set(USER);
    restored();
    TestBed.tick();
    await Promise.resolve();
    http.expectOne(URL).flush({ ...SAVED, dashboardTaskLimit: 12 });
    expect(store.taskLimit()).toBe(12);
  });

  it('drops cached settings at start-up when nobody is signed in', () => {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(SAVED));
    const store = start();

    expect(store.settings()).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem(SETTINGS_CACHE_KEY)).toBeNull();
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('100%');
  });

  it('drops cached settings when the stored token is rejected during restore', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'expired');
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(SAVED));
    const store = start();
    expect(store.settings()).toEqual(SAVED);

    // SessionService clears the token when /me answers 401.
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    restored();
    await Promise.resolve();
    await Promise.resolve();

    expect(store.settings()).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem(SETTINGS_CACHE_KEY)).toBeNull();
  });

  it('loads on sign-in and clears the settings and cache on sign-out', () => {
    const store = start();
    restored();

    currentUser.set(USER);
    TestBed.tick();
    http.expectOne(URL).flush(SAVED);
    expect(store.settings()).toEqual(SAVED);
    expect(cached()).toEqual(SAVED);

    currentUser.set(null);
    TestBed.tick();
    expect(store.settings()).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem(SETTINGS_CACHE_KEY)).toBeNull();
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('100%');
  });
});
