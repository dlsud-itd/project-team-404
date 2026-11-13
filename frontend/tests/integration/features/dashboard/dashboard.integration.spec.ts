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
import type { ApiTask } from '../../../../src/app/features/tasks/shared/types/task.types';
import { environment } from '../../../../src/environments/environment';

/**
 * Dashboard frontend integration tests (Sprint 4: FE-CUR rows, and FE-OVD where the two
 * sections meet).
 *
 * The app runs through its real /dashboard route behind authGuard: the dashboard page, the
 * Current & Upcoming section with its task groups and group-by-day util, the Overdue section,
 * DashboardService, SessionService and authInterceptor. The user is signed in by restoring a
 * stored token and answering GET /api/auth/me, whose timezone decides "today". Only the network
 * and the clock (DASHBOARD_NOW) are faked; responses follow backend/src/features/dashboard
 * (`{ tasks }` of toTaskModel tasks, open tasks only, ordered by due date).
 */

const AUTH_API = `${environment.apiBaseUrl}/api/auth`;
const PROJECTS_API = `${environment.apiBaseUrl}/api/projects`;
const CURRENT_API = `${environment.apiBaseUrl}/api/dashboard/current-upcoming-tasks`;
const OVERDUE_API = `${environment.apiBaseUrl}/api/dashboard/overdue-tasks`;
const TOKEN = 'session-token';

const USER = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 1,
};

/**
 * 16:30 UTC on Friday 6 November 2026: already 00:30 on Saturday 7 November in Manila (UTC+8),
 * but still 6 November in London (UTC+0).
 */
const NEAR_MIDNIGHT = '2026-11-06T16:30:00.000Z';

/** A task as toTaskModel in backend/src/features/tasks/shared/models/task.model.ts sends it. */
function apiTask(id: number, title: string, overrides: Partial<ApiTask> = {}): ApiTask {
  return {
    id,
    projectId: 10,
    title,
    description: null,
    priority: 'low',
    scheduledDate: null,
    dueDate: null,
    deadline: null,
    recurrence: null,
    recurrenceDays: [],
    recurrenceEndDate: null,
    isDone: false,
    doneAt: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    labels: [],
    ...overrides,
  };
}

// What the server returns for a Manila user at NEAR_MIDNIGHT, soonest due date first.
const UPCOMING = [
  apiTask(1, 'Morning run', { dueDate: '2026-11-07', priority: 'high' }),
  apiTask(2, 'Buy groceries', { dueDate: '2026-11-08' }),
  apiTask(3, 'Submit essay', { dueDate: '2026-11-09', priority: 'medium' }),
  apiTask(4, 'Team meeting', { dueDate: '2026-11-12', projectId: null }),
];

const OVERDUE = [
  apiTask(20, 'Pay rent', { dueDate: '2026-11-01', deadline: '2026-11-01T15:59:59.999Z' }),
];

const status = (code: number, statusText = 'Error') => ({ status: code, statusText });

describe('Dashboard integration (Current & Upcoming + API)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;
  let now: string;

  const page = () => harness.fixture.nativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const text = (selector: string) => el(selector)?.textContent?.trim().replace(/\s+/g, ' ') ?? '';

  const currentSection = () => el('app-current-upcoming-tasks');
  const overdueSection = () => el('app-overdue-tasks');

  /** Task titles in one day group, top to bottom. */
  function titles(group: 'today' | 'tomorrow' | 'later'): string[] {
    return all(`app-task-group [data-group="${group}"] .title`).map(
      (t) => t.textContent?.trim() ?? '',
    );
  }

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  /** Signs in the way a page load does: a stored token that GET /api/auth/me accepts. */
  async function startSignedIn(user: object = USER): Promise<void> {
    localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    http.expectOne(`${AUTH_API}/me`).flush(user);
  }

  function expectCurrent(): TestRequest {
    const req = http.expectOne((r) => r.url === CURRENT_API);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    return req;
  }

  function expectOverdue(): TestRequest {
    const req = http.expectOne(OVERDUE_API);
    expect(req.request.method).toBe('GET');
    return req;
  }

  /** The Overdue section also loads projects for its dot colors. */
  function answerProjects(): void {
    http.match((req) => req.url === PROJECTS_API).forEach((req) => req.flush([]));
  }

  /** Opens /dashboard; its two sections send their requests straight away. */
  async function openDashboard(): Promise<void> {
    await harness.navigateByUrl('/dashboard');
    await settle();
    answerProjects();
  }

  /** Opens /dashboard and answers both sections. */
  async function openWith(upcoming: ApiTask[], overdue: ApiTask[] = OVERDUE): Promise<void> {
    await openDashboard();
    expectCurrent().flush({ tasks: upcoming });
    expectOverdue().flush({ tasks: overdue });
    await settle();
  }

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    now = NEAR_MIDNIGHT;
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideSessionRestore(),
        { provide: DASHBOARD_NOW, useValue: () => new Date(now) },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    try {
      if (http) http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  // Case 1
  describe('Access', () => {
    // FE-CUR-10
    it('sends a signed-out visitor to /login without asking for any tasks', async () => {
      http = TestBed.inject(HttpTestingController);
      router = TestBed.inject(Router);
      harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/dashboard');
      await settle();

      expect(router.url).toBe('/login');
      http.expectNone(CURRENT_API);
      http.expectNone(OVERDUE_API);
    });
  });

  // Case 2
  describe('Loading and grouping', () => {
    // FE-CUR-01, FE-CUR-07
    it('requests the next 7 days and groups the tasks into Today, Tomorrow and Later', async () => {
      await startSignedIn();
      await openDashboard();

      const req = expectCurrent();
      expect(req.request.params.get('days')).toBe('7');
      expect(req.request.params.keys()).toEqual(['days']);
      req.flush({ tasks: UPCOMING });
      expectOverdue().flush({ tasks: OVERDUE });
      await settle();

      expect(text('#current-upcoming-heading')).toBe('Current & Upcoming');
      expect(text('app-current-upcoming-tasks .summary')).toBe('4 tasks');
      expect(all('app-task-group h3').map((h) => h.firstChild?.textContent?.trim())).toEqual([
        'Today',
        'Tomorrow',
        'Later',
      ]);
      expect(titles('today')).toEqual(['Morning run']);
      expect(titles('tomorrow')).toEqual(['Buy groceries']);
      expect(titles('later')).toEqual(['Submit essay', 'Team meeting']);

      // Counts, priorities and (for Later only) dates.
      expect(el('[data-group="later"] .count').getAttribute('aria-label')).toBe('2 tasks');
      expect(el('[data-group="today"] .priority').getAttribute('aria-label')).toBe('High priority');
      expect(el('[data-group="today"] .due')).toBeNull();
      expect(all('[data-group="later"] .due').map((d) => d.textContent?.trim())).toEqual([
        'Nov 9',
        'Nov 12',
      ]);

      // Tasks link to their edit page, except one whose project was deleted.
      expect(el<HTMLAnchorElement>('[data-group="today"] a.title').getAttribute('href')).toBe(
        '/projects/10/tasks/1/edit',
      );
      expect(el('[data-group="later"] li:last-child a.title')).toBeNull();
      expect(text('[data-group="later"] li:last-child span.title')).toBe('Team meeting');
    });

    // FE-CUR-07
    it("orders Later by due date even when the server's order differs", async () => {
      await startSignedIn();
      await openWith([UPCOMING[3], UPCOMING[2]]);

      expect(titles('later')).toEqual(['Submit essay', 'Team meeting']);
    });

    // FE-CUR-07: the same task, due 7 November, seen just after midnight in Manila.
    it.each([
      ['Asia/Manila', 'today', 'tomorrow'],
      ['Europe/London', 'tomorrow', 'today'],
    ] as const)(
      'uses the %s session timezone to decide that a task near midnight is due %s',
      async (timezone, group, otherGroup) => {
        await startSignedIn({ ...USER, timezone });
        await openWith([apiTask(5, 'Near midnight', { dueDate: '2026-11-07' })]);

        expect(titles(group)).toEqual(['Near midnight']);
        expect(titles(otherGroup)).toEqual([]);
        expect(titles('later')).toEqual([]);
      },
    );

    // FE-CUR-07
    it('leaves out a task due before today, which belongs to Overdue', async () => {
      await startSignedIn();
      await openWith([apiTask(6, 'Yesterday', { dueDate: '2026-11-06' }), UPCOMING[0]]);

      expect(titles('today')).toEqual(['Morning run']);
      expect(text('app-current-upcoming-tasks .summary')).toBe('1 task');
    });
  });

  // Case 3
  describe('Loading, empty and error states', () => {
    // FE-CUR-08
    it('shows a loading state until the tasks arrive, then the groups', async () => {
      await startSignedIn();
      await openDashboard();

      expect(text('app-current-upcoming-tasks [role="status"]')).toBe('Loading your tasks…');
      expect(all('app-task-group')).toHaveLength(0);

      expectCurrent().flush({ tasks: UPCOMING });
      expectOverdue().flush({ tasks: [] });
      await settle();

      expect(el('app-current-upcoming-tasks [role="status"]')).toBeNull();
      expect(all('app-task-group')).toHaveLength(3);
    });

    // FE-CUR-04
    it('shows each group as empty when nothing is due', async () => {
      await startSignedIn();
      await openWith([], []);

      expect(text('app-current-upcoming-tasks .summary')).toBe('0 tasks');
      expect(all('app-task-group .empty').map((p) => p.textContent?.trim())).toEqual([
        'Nothing due today.',
        'Nothing due tomorrow.',
        'Nothing else due this week.',
      ]);
      expect(all('app-task-group li')).toHaveLength(0);
      expect(currentSection().querySelector('[role="alert"]')).toBeNull();
    });

    // FE-CUR-09
    it('shows an error on a 500 and loads again from Try again', async () => {
      await startSignedIn();
      await openDashboard();
      expectCurrent().flush({ error: 'Internal server error' }, status(500));
      expectOverdue().flush({ tasks: [] });
      await settle();

      expect(currentSection().querySelector('[role="alert"] p')?.textContent?.trim()).toBe(
        "We couldn't load your tasks. Please try again.",
      );
      expect(all('app-task-group')).toHaveLength(0);
      expect(el('app-current-upcoming-tasks .summary')).toBeNull();

      el<HTMLButtonElement>('app-current-upcoming-tasks button.retry').click();
      await settle();
      expect(text('app-current-upcoming-tasks [role="status"]')).toBe('Loading your tasks…');

      const retry = expectCurrent();
      expect(retry.request.params.get('days')).toBe('7');
      retry.flush({ tasks: UPCOMING });
      await settle();

      expect(currentSection().querySelector('[role="alert"]')).toBeNull();
      expect(titles('today')).toEqual(['Morning run']);
    });

    // FE-CUR-07, FE-CUR-09
    it('works out "today" again when retrying after midnight', async () => {
      await startSignedIn({ ...USER, timezone: 'Europe/London' });
      await openDashboard();
      expectCurrent().flush({ error: 'Internal server error' }, status(500));
      expectOverdue().flush({ tasks: [] });
      await settle();

      // Past midnight in London too: 7 November is now today.
      now = '2026-11-07T00:30:00.000Z';
      el<HTMLButtonElement>('app-current-upcoming-tasks button.retry').click();
      await settle();
      expectCurrent().flush({ tasks: [apiTask(5, 'Near midnight', { dueDate: '2026-11-07' })] });
      await settle();

      expect(titles('today')).toEqual(['Near midnight']);
    });
  });

  // Case 4
  describe('Sections are independent', () => {
    // FE-CUR-09, FE-OVD-05
    it('keeps the Overdue section when Current & Upcoming fails', async () => {
      await startSignedIn();
      await openDashboard();
      expectCurrent().flush({ error: 'Internal server error' }, status(500));
      expectOverdue().flush({ tasks: OVERDUE });
      await settle();

      expect(currentSection().querySelector('[role="alert"]')).toBeTruthy();
      expect(overdueSection().querySelector('[role="alert"]')).toBeNull();
      expect(overdueSection().querySelector('.title')?.textContent?.trim()).toBe('Pay rent');
    });

    // FE-CUR-09, FE-OVD-05
    it('keeps Current & Upcoming when the Overdue section fails', async () => {
      await startSignedIn();
      await openDashboard();
      expectCurrent().flush({ tasks: UPCOMING });
      expectOverdue().flush({ error: 'Internal server error' }, status(500));
      await settle();

      expect(overdueSection().querySelector('[role="alert"] p')?.textContent?.trim()).toBe(
        "We couldn't load your tasks. Please try again.",
      );
      expect(currentSection().querySelector('[role="alert"]')).toBeNull();
      expect(titles('today')).toEqual(['Morning run']);

      // Retrying Overdue does not reload Current & Upcoming.
      el<HTMLButtonElement>('app-overdue-tasks button.retry').click();
      await settle();
      http.expectNone(CURRENT_API);
      expectOverdue().flush({ tasks: OVERDUE });
      await settle();
      expect(overdueSection().querySelector('.title')?.textContent?.trim()).toBe('Pay rent');
    });
  });

  // Case 5
  describe('Expired session', () => {
    // FE-CUR-11
    it('clears the session and redirects to /login on a 401', async () => {
      await startSignedIn();
      await openDashboard();

      const overdue = expectOverdue();
      expectCurrent().flush({ error: 'Token invalid or expired' }, status(401, 'Unauthorized'));
      await settle();

      // Leaving the page cancels the Overdue request that was still waiting.
      expect(overdue.cancelled).toBe(true);
      expect(router.url).toBe('/login');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });
});
