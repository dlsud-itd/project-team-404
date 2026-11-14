import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  type TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../../src/app/app.routes';
import { provideSessionRestore } from '../../../../src/app/features/auth/session/auth.guards';
import { authInterceptor } from '../../../../src/app/features/auth/session/auth.interceptor';
import { TOKEN_STORAGE_KEY } from '../../../../src/app/features/auth/session/token-storage.service';
import { DASHBOARD_NOW } from '../../../../src/app/features/dashboard/shared/services/dashboard.service';
import { providePriorityLevels } from '../../../../src/app/features/settings/state/priorities.store';
import {
  FONT_FAMILY_PROPERTY,
  FONT_SIZE_PROPERTY,
  SETTINGS_CACHE_KEY,
  provideUserSettings,
} from '../../../../src/app/features/settings/state/settings.store';
import { FONT_FAMILIES } from '../../../../src/app/features/settings/types/user-settings.types';
import type { ApiTask } from '../../../../src/app/features/tasks/shared/types/task.types';
import { environment } from '../../../../src/environments/environment';

/**
 * Settings > Config and Settings > Preferences frontend integration tests, with the limited
 * dashboard widgets (Sprint 5: FE-SET rows).
 *
 * The app runs through its real app shell, /login, /settings/config, /settings/preferences,
 * /dashboard and /home routes behind authGuard, with the real SettingsService, SettingsStore,
 * SessionService, DashboardService, the dashboard sections, the home project list and
 * authInterceptor. providePriorityLevels() and provideUserSettings() are registered as in
 * app.config.ts, so signing in loads the user's settings and applies the font to <html>.
 *
 * Only the network and the dashboard clock are faked. Bodies follow the backend:
 * toUserSettingsModel (backend/src/features/settings/models), the validate-request middleware's
 * 400 body, the dashboard controllers' `{ tasks }` of toTaskModel tasks, and toProjectModel.
 */

const API = `${environment.apiBaseUrl}/api`;
const AUTH_API = `${API}/auth`;
const SETTINGS_API = `${API}/settings`;
const PRIORITIES_API = `${API}/priorities`;
const PROJECTS_API = `${API}/projects`;
const TASKS_API = `${API}/tasks`;
const CURRENT_API = `${API}/dashboard/current-upcoming-tasks`;
const OVERDUE_API = `${API}/dashboard/overdue-tasks`;
const TOKEN = 'session-token';
const PASSWORD = 'password123';

const USER = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 1,
};

/** 10:00 on Saturday 14 November 2026 in Manila. */
const NOW = '2026-11-14T02:00:00.000Z';
const STAMPS = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' };

type ApiSettings = {
  userId: string;
  dashboardTaskLimit: number;
  dashboardProjectLimit: number;
  fontSize: string;
  fontFamily: string;
  createdAt: string;
  updatedAt: string;
};

/** GET/PATCH /api/settings as toUserSettingsModel sends it; the defaults unless overridden. */
function settings(overrides: Partial<ApiSettings> = {}): ApiSettings {
  return {
    userId: USER.id,
    dashboardTaskLimit: 5,
    dashboardProjectLimit: 5,
    fontSize: 'medium',
    fontFamily: 'system',
    ...STAMPS,
    ...overrides,
  };
}

const css = (family: string) => FONT_FAMILIES.find((option) => option.value === family)!.css;
const DEFAULT_LOOK = { size: '100%', family: css('system') };
const LARGE_SERIF = { size: '112.5%', family: css('serif') };

/** A task as toTaskModel sends it. */
function apiTask(id: number, title: string, overrides: Partial<ApiTask> = {}): ApiTask {
  return {
    id,
    projectId: 10,
    title,
    description: null,
    priority: 'medium',
    scheduledDate: null,
    dueDate: null,
    deadline: null,
    recurrence: 'none',
    recurrenceDays: [],
    recurrenceEndDate: null,
    isDone: false,
    doneAt: null,
    ...STAMPS,
    labels: [],
    ...overrides,
  } as ApiTask;
}

// Six open tasks due today through Tuesday, and five past their deadline.
const UPCOMING = [
  apiTask(1, 'Pay bills', { dueDate: '2026-11-14' }),
  apiTask(2, 'Call mom', { dueDate: '2026-11-14' }),
  apiTask(3, 'Water plants', { dueDate: '2026-11-15' }),
  apiTask(4, 'Laundry', { dueDate: '2026-11-15' }),
  apiTask(5, 'Gym', { dueDate: '2026-11-17' }),
  apiTask(6, 'Read chapter 5', { dueDate: '2026-11-18' }),
];
const OVERDUE = [1, 2, 3, 4, 5].map((day) =>
  apiTask(20 + day, `Late task ${day}`, {
    dueDate: `2026-11-0${day}`,
    deadline: `2026-11-0${day}T15:59:59.999Z`,
  }),
);

/** A project as toProjectModel sends it. */
function apiProject(id: number, name: string, sortOrder: number, isInbox = false) {
  return {
    id,
    name,
    description: null,
    color: '#1F9D3A',
    isInbox,
    isFavorite: false,
    isArchived: false,
    sortOrder,
    ...STAMPS,
  };
}
const PROJECTS = [
  apiProject(1, 'Inbox', -1, true),
  ...['School', 'Work', 'Personal', 'Health', 'Travel', 'Side project'].map((name, index) =>
    apiProject(10 + index, name, index),
  ),
];

const status = (code: number, statusText = 'Error') => ({ status: code, statusText });

describe('Settings integration (Config, Preferences and limited dashboard widgets + API)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const root = () => document.documentElement;
  const page = () => harness.fixture.nativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const clean = (value: string | null | undefined) => value?.trim().replace(/\s+/g, ' ') ?? '';
  const text = (selector: string) => clean(el(selector)?.textContent);
  const button = (label: string) =>
    all('button').find((candidate) => clean(candidate.textContent) === label) as
      HTMLButtonElement | undefined;

  /** The font size and family set on <html>. */
  function look(): { size: string; family: string } {
    return {
      size: root().style.getPropertyValue(FONT_SIZE_PROPERTY),
      family: root().style.getPropertyValue(FONT_FAMILY_PROPERTY),
    };
  }

  function cached(): Record<string, unknown> | null {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  }

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  function type(selector: string, value: string): void {
    const input = el<HTMLInputElement>(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    harness.detectChanges();
  }

  async function press(target: HTMLElement | undefined): Promise<void> {
    expect(target, 'element to press').toBeTruthy();
    target!.click();
    await settle();
  }

  function expectAuthorized(req: TestRequest, method: string): TestRequest {
    expect(req.request.method).toBe(method);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    return req;
  }

  function expectSettingsGet(): TestRequest {
    return expectAuthorized(
      http.expectOne((r) => r.url === SETTINGS_API && r.method === 'GET'),
      'GET',
    );
  }

  function expectSettingsPatch(): TestRequest {
    return expectAuthorized(
      http.expectOne((r) => r.url === SETTINGS_API && r.method === 'PATCH'),
      'PATCH',
    );
  }

  /** Signing in also loads the user's priority levels; they don't matter here. */
  function answerPriorities(): void {
    http.match(PRIORITIES_API).forEach((req) => req.flush([]));
  }

  async function createApp(): Promise<void> {
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  }

  /** Signs in the way a page load does: a stored token that GET /api/auth/me accepts. */
  async function startSignedIn(saved: ApiSettings = settings()): Promise<void> {
    localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    await createApp();
    http.expectOne(`${AUTH_API}/me`).flush(USER);
    await settle();
    answerPriorities();
    expectSettingsGet().flush(saved);
    await settle();
  }

  /** Answers /home's project and task requests. */
  function answerHome(projects = PROJECTS): void {
    http
      .match((r) => r.url === PROJECTS_API && r.method === 'GET')
      .forEach((r) => r.flush(r.request.params.get('isArchived') === 'true' ? [] : projects));
    http.match((r) => r.url === TASKS_API && r.method === 'GET').forEach((r) => r.flush([]));
  }

  async function openDashboard(
    upcoming: ApiTask[] = UPCOMING,
    overdue: ApiTask[] = OVERDUE,
  ): Promise<void> {
    await harness.navigateByUrl('/dashboard');
    await settle();
    // The Overdue section loads projects for its dot colors.
    http.match((r) => r.url === PROJECTS_API).forEach((r) => r.flush(PROJECTS));
    http.expectOne((r) => r.url === CURRENT_API).flush({ tasks: upcoming });
    http.expectOne(OVERDUE_API).flush({ tasks: overdue });
    await settle();
  }

  /** Opens a settings page; each one asks for fresh settings. */
  async function openSettings(path: 'config' | 'preferences', saved = settings()): Promise<void> {
    await harness.navigateByUrl(`/settings/${path}`);
    await settle();
    expectSettingsGet().flush(saved);
    await settle();
  }

  function limitField(id: 'dashboard-task-limit' | 'dashboard-project-limit'): HTMLInputElement {
    return el<HTMLInputElement>(`#${id}`);
  }

  function saveButton(): HTMLButtonElement {
    return el<HTMLButtonElement>('form button[type="submit"]');
  }

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    root().style.removeProperty(FONT_SIZE_PROPERTY);
    root().style.removeProperty(FONT_FAMILY_PROPERTY);
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideSessionRestore(),
        providePriorityLevels(),
        provideUserSettings(),
        { provide: DASHBOARD_NOW, useValue: () => new Date(NOW) },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    try {
      if (http) http.verify();
    } finally {
      TestBed.resetTestingModule();
      localStorage.clear();
      root().style.removeProperty(FONT_SIZE_PROPERTY);
      root().style.removeProperty(FONT_FAMILY_PROPERTY);
    }
  });

  // Case 1
  describe('Applying the saved font', () => {
    // FE-SET-01
    it('applies the saved font to <html> after login, before the dashboard renders', async () => {
      await createApp();
      await harness.navigateByUrl('/login');
      await settle();
      expect(look()).toEqual(DEFAULT_LOOK);

      type('#identifier', USER.email);
      type('#password', PASSWORD);
      el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
      await settle();
      http.expectOne(`${AUTH_API}/login`).flush({ token: TOKEN, user: USER });
      await settle();
      answerPriorities();
      answerHome();
      expect(router.url).toBe('/home');

      expectSettingsGet().flush(settings({ fontSize: 'large', fontFamily: 'serif' }));
      await settle();
      expect(look()).toEqual(LARGE_SERIF);
      expect(cached()).toEqual(expect.objectContaining({ fontSize: 'large', fontFamily: 'serif' }));

      // While /dashboard waits for its tasks, the page already has the saved font.
      await harness.navigateByUrl('/dashboard');
      await settle();
      expect(text('app-current-upcoming-tasks [role="status"]')).toBe('Loading your tasks…');
      expect(look()).toEqual(LARGE_SERIF);
      http.match((r) => r.url === PROJECTS_API).forEach((r) => r.flush(PROJECTS));
      http.expectOne((r) => r.url === CURRENT_API).flush({ tasks: [] });
      http.expectOne(OVERDUE_API).flush({ tasks: [] });
      await settle();
      expect(look()).toEqual(LARGE_SERIF);
    });

    // FE-SET-01
    it('applies the cached font on reload before any request is answered, so nothing flashes', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
      localStorage.setItem(
        SETTINGS_CACHE_KEY,
        JSON.stringify({
          dashboardTaskLimit: 5,
          dashboardProjectLimit: 5,
          fontSize: 'large',
          fontFamily: 'serif',
          updatedAt: STAMPS.updatedAt,
        }),
      );

      await createApp();
      // GET /api/auth/me has not been answered yet.
      expect(look()).toEqual(LARGE_SERIF);

      http.expectOne(`${AUTH_API}/me`).flush(USER);
      await settle();
      answerPriorities();
      const req = expectSettingsGet();
      expect(look()).toEqual(LARGE_SERIF);
      req.flush(settings({ fontSize: 'large', fontFamily: 'serif' }));
      await settle();
      expect(look()).toEqual(LARGE_SERIF);
    });
  });

  // Case 2
  describe('Preferences', () => {
    function pickSize(value: string): void {
      const radio = el<HTMLInputElement>(`input[name="font-size"][value="${value}"]`);
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
      harness.detectChanges();
    }

    function pickFamily(value: string): void {
      const select = el<HTMLSelectElement>('#font-family');
      select.value = value;
      select.dispatchEvent(new Event('change'));
      harness.detectChanges();
    }

    // FE-SET-02
    it('previews a new size and font on the page at once and saves them with PATCH', async () => {
      await startSignedIn();
      await openSettings('preferences');
      expect(look()).toEqual(DEFAULT_LOOK);

      pickSize('large');
      await settle();
      expect(text('#font-preview-caption')).toBe('Preview · Large');
      expect(look().size).toBe('112.5%');

      pickFamily('serif');
      await settle();
      expect(el<HTMLElement>('.preview-text').style.fontFamily).toContain('Georgia');
      expect(look()).toEqual(LARGE_SERIF);
      expect(text('.unsaved')).toBe('Unsaved changes');
      http.expectNone((r) => r.method === 'PATCH');

      await press(saveButton());
      const req = expectSettingsPatch();
      expect(req.request.body).toEqual({ fontSize: 'large', fontFamily: 'serif' });
      req.flush(settings({ fontSize: 'large', fontFamily: 'serif', updatedAt: NOW }));
      await settle();

      expect(text('.form-notice')).toBe('Preferences saved.');
      expect(el('.unsaved')).toBeNull();
      expect(look()).toEqual(LARGE_SERIF);
      expect(cached()).toEqual(expect.objectContaining({ fontSize: 'large', fontFamily: 'serif' }));
    });

    // FE-SET-02
    it('Cancel puts the saved size and font back without saving', async () => {
      const saved = settings({ fontSize: 'large', fontFamily: 'serif' });
      await startSignedIn(saved);
      await openSettings('preferences', saved);

      pickSize('small');
      pickFamily('monospace');
      await settle();
      expect(look()).toEqual({ size: '87.5%', family: css('monospace') });

      await press(button('Cancel'));
      expect(look()).toEqual(LARGE_SERIF);
      expect(el<HTMLInputElement>('input[name="font-size"][value="large"]').checked).toBe(true);
      expect(el<HTMLSelectElement>('#font-family').value).toBe('serif');
      expect(text('#font-preview-caption')).toBe('Preview · Large');
      expect(saveButton().disabled).toBe(true);
      http.expectNone((r) => r.method === 'PATCH');
    });
  });

  // Case 3
  describe('Config', () => {
    // FE-SET-03
    it('shows an error for 0 and 51 and blocks Save', async () => {
      await startSignedIn();
      await openSettings('config');
      expect(limitField('dashboard-task-limit').value).toBe('5');

      type('#dashboard-task-limit', '0');
      await settle();
      expect(text('#dashboard-task-limit-error')).toBe('Choose a number from 1 to 50.');
      expect(limitField('dashboard-task-limit').getAttribute('aria-invalid')).toBe('true');
      expect(saveButton().disabled).toBe(true);

      type('#dashboard-task-limit', '3');
      type('#dashboard-project-limit', '51');
      await settle();
      expect(text('#dashboard-task-limit-error')).toBe('');
      expect(text('#dashboard-project-limit-error')).toBe('Choose a number from 1 to 50.');
      expect(saveButton().disabled).toBe(true);

      el<HTMLFormElement>('app-config-settings form').dispatchEvent(new Event('submit'));
      await settle();
      http.expectNone((r) => r.method === 'PATCH');
    });

    // FE-SET-02, FE-SET-04
    it('saves 3 tasks and 4 projects with PATCH /settings', async () => {
      await startSignedIn();
      await openSettings('config');

      type('#dashboard-task-limit', '3');
      type('#dashboard-project-limit', '4');
      await settle();
      expect(saveButton().disabled).toBe(false);
      await press(saveButton());

      const req = expectSettingsPatch();
      expect(req.request.body).toEqual({ dashboardTaskLimit: 3, dashboardProjectLimit: 4 });
      req.flush(settings({ dashboardTaskLimit: 3, dashboardProjectLimit: 4, updatedAt: NOW }));
      await settle();

      expect(text('.form-notice')).toBe('Dashboard limits saved.');
      expect(limitField('dashboard-task-limit').value).toBe('3');
      expect(limitField('dashboard-project-limit').value).toBe('4');
      expect(cached()).toEqual(
        expect.objectContaining({ dashboardTaskLimit: 3, dashboardProjectLimit: 4 }),
      );
    });
  });

  // Case 4
  describe('Limited dashboard widgets', () => {
    const limited = settings({ dashboardTaskLimit: 3, dashboardProjectLimit: 4 });

    // FE-SET-04
    it('lists 3 tasks in each dashboard task widget with View all (N)', async () => {
      await startSignedIn(limited);
      await openDashboard();

      const current = el('app-current-upcoming-tasks');
      expect(current.querySelectorAll('li.task')).toHaveLength(3);
      expect(
        [...current.querySelectorAll('li.task .title')].map((t) => clean(t.textContent)),
      ).toEqual(['Pay bills', 'Call mom', 'Water plants']);
      expect(clean(current.querySelector('.summary')?.textContent)).toBe('6 tasks');
      const currentAll = current.querySelector<HTMLAnchorElement>('a.view-all')!;
      expect(clean(currentAll.textContent)).toBe('View all (6)');
      expect(currentAll.getAttribute('href')).toBe('/home?tab=tasks');

      const overdue = el('app-overdue-tasks');
      expect(overdue.querySelectorAll('li.task')).toHaveLength(3);
      expect(clean(overdue.querySelector('a.view-all')?.textContent)).toBe('View all (5)');
    });

    // FE-SET-04
    it('lists 4 projects on /home, and View all opens the full project list', async () => {
      await startSignedIn(limited);
      await harness.navigateByUrl('/home');
      await settle();
      answerHome();
      await settle();

      const names = all('app-project-list li.project .name').map((n) => clean(n.textContent));
      // The first four in the user's order, Inbox included.
      expect(names).toEqual(['Inbox', 'School', 'Work', 'Personal']);
      const viewAll = el<HTMLAnchorElement>('app-project-list a.view-all');
      expect(clean(viewAll.textContent)).toBe(`View all (${PROJECTS.length})`);

      await press(viewAll);
      answerHome();
      await settle();
      expect(router.url).toBe('/home?tab=projects');
      const cards = all('app-projects-page app-project-card');
      expect(cards.length).toBe(PROJECTS.length);
    });
  });

  // Case 5
  describe('Reset to defaults', () => {
    // FE-SET-02
    it('saves 5 and 5 straight away', async () => {
      const limited = settings({ dashboardTaskLimit: 3, dashboardProjectLimit: 4 });
      await startSignedIn(limited);
      await openSettings('config', limited);

      await press(button('Reset to defaults'));
      const req = expectSettingsPatch();
      expect(req.request.body).toEqual({ dashboardTaskLimit: 5, dashboardProjectLimit: 5 });
      req.flush(settings({ updatedAt: NOW }));
      await settle();

      expect(text('.form-notice')).toBe('Limits reset to the defaults.');
      expect(limitField('dashboard-task-limit').value).toBe('5');
      expect(limitField('dashboard-project-limit').value).toBe('5');
      expect(button('Reset to defaults')?.disabled).toBe(true);
    });
  });

  // Case 6
  describe('Logging out', () => {
    // FE-SET-01
    it('clears the cached settings and the applied font', async () => {
      await startSignedIn(settings({ fontSize: 'large', fontFamily: 'serif' }));
      await openDashboard([], []);
      expect(cached()).not.toBeNull();
      expect(look()).toEqual(LARGE_SERIF);

      await press(el('button.avatar'));
      await press(el('button.logout'));
      http.expectOne(`${AUTH_API}/logout`).flush(null);
      await settle();

      expect(router.url).toBe('/login');
      expect(localStorage.getItem(SETTINGS_CACHE_KEY)).toBeNull();
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(look()).toEqual(DEFAULT_LOOK);
    });
  });

  // Case 7
  describe('Failures', () => {
    // FE-SET-03, FE-SET-05
    it('shows the server message for a 400 and keeps the saved limits', async () => {
      await startSignedIn();
      await openSettings('config');

      type('#dashboard-task-limit', '7');
      await settle();
      await press(saveButton());
      expectSettingsPatch().flush(
        {
          error: 'Invalid settings update',
          details: [{ field: 'dashboardTaskLimit', message: 'Too big: expected number to be <=6' }],
        },
        status(400, 'Bad Request'),
      );
      await settle();

      expect(text('app-config-settings p.alert[role="alert"]')).toBe(
        'Invalid settings update: Too big: expected number to be <=6',
      );
      expect(el('.form-notice')).toBeNull();
      expect(cached()).toEqual(expect.objectContaining({ dashboardTaskLimit: 5 }));
      // The edit is kept so the user can correct it.
      expect(limitField('dashboard-task-limit').value).toBe('7');
    });

    // FE-SET-05
    it('shows Try again when loading the settings returns 500, and the retry loads them', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
      await createApp();
      http.expectOne(`${AUTH_API}/me`).flush(USER);
      await settle();
      answerPriorities();
      expectSettingsGet().flush({ error: 'Internal server error' }, status(500));
      await settle();

      await harness.navigateByUrl('/settings/preferences');
      await settle();
      expectSettingsGet().flush({ error: 'Internal server error' }, status(500));
      await settle();

      expect(text('app-preferences-settings div.alert')).toBe(
        "Couldn't load your settings. Try again",
      );
      expect(saveButton().disabled).toBe(true);

      await press(button('Try again'));
      expectSettingsGet().flush(settings({ fontSize: 'large', fontFamily: 'serif' }));
      await settle();

      expect(el('app-preferences-settings div.alert')).toBeNull();
      expect(el<HTMLInputElement>('input[name="font-size"][value="large"]').checked).toBe(true);
      expect(look()).toEqual(LARGE_SERIF);
    });

    // FE-SET-05
    it('sends the user to /login when saving returns 401', async () => {
      await startSignedIn();
      await openSettings('config');

      type('#dashboard-task-limit', '3');
      await settle();
      await press(saveButton());
      expectSettingsPatch().flush({ error: 'Unauthorized' }, status(401, 'Unauthorized'));
      await settle();

      expect(router.url).toBe('/login');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(SETTINGS_CACHE_KEY)).toBeNull();
    });
  });
});
