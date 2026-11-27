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
import type { DashboardStreak } from '../../../../src/app/features/dashboard/shared/types/dashboard.types';
import type { ApiTask } from '../../../../src/app/features/tasks/shared/types/task.types';
import { STREAKS_NOW } from '../../../../src/app/features/tasks/task-streaks/services/task-streaks.service';
import type { ApiTaskStreak } from '../../../../src/app/features/tasks/task-streaks/types/task-streak.types';
import { environment } from '../../../../src/environments/environment';

/**
 * Task Streaks frontend integration tests (Sprint 6: FE-STR-01 to FE-STR-04).
 *
 * The app runs through its real routes behind authGuard: a task's edit page with the streak
 * detail and badge, the home task list, and the /dashboard Streaks section, with
 * TaskStreaksService, TaskService, DashboardService, SessionService and authInterceptor. The user
 * is signed in by restoring a stored token and answering GET /api/auth/me, whose timezone decides
 * "today". Only the network and the clock are faked; responses follow the Sprint 6 API
 * specification and backend/src/features/tasks/task-streaks, with the 404 from
 * task-streaks.routes.ts, require-auth's 401 and the error handler's 500.
 *
 * Cases: (1) recurring tasks show a badge with the count and a text label, others none; (2) the
 * tooltip and detail show the longest streak and the last 14 periods; (3) at-risk styling while
 * today's occurrence is open; (4) completing refetches and shows the new count and the next
 * occurrence; (5) the dashboard lists at-risk streaks first and has an empty state; (6) a failed
 * streak request hides the badge without breaking the list, and a 401 opens /login.
 */

const API = environment.apiBaseUrl;
const AUTH_API = `${API}/api/auth`;
const PROJECTS_API = `${API}/api/projects`;
const LABELS_API = `${API}/api/labels`;
const TASKS_API = `${API}/api/tasks`;
const DASHBOARD_API = `${API}/api/dashboard`;
const DASHBOARD_STREAKS = `${DASHBOARD_API}/streaks?limit=20`;
const TOKEN = 'session-token';

const USER = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 1,
};

/** Noon on Thursday 19 November 2026 in Manila. */
const NOW = '2026-11-19T04:00:00.000Z';
const TODAY = '2026-11-19';

const CAPSTONE = {
  id: 10,
  name: 'Capstone',
  description: null,
  color: null,
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 1,
};

/** A task as toTaskModel in backend/src/features/tasks/shared/models/task.model.ts sends it. */
function apiTask(id: number, title: string, overrides: Partial<ApiTask> = {}): ApiTask {
  return {
    id,
    projectId: CAPSTONE.id,
    title,
    description: null,
    priority: 'medium',
    scheduledDate: TODAY,
    dueDate: TODAY,
    deadline: null,
    recurrence: 'daily',
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

/** GET /api/tasks/:taskId/streak. */
function taskStreak(taskId: number, overrides: Partial<ApiTaskStreak> = {}): ApiTaskStreak {
  return {
    taskId,
    currentStreak: 4,
    longestStreak: 7,
    lastCompletedOn: TODAY,
    nextOccurrenceOn: '2026-11-20',
    timezone: USER.timezone,
    ...overrides,
  };
}

/** One item of GET /api/dashboard/streaks. */
function dashboardStreak(
  taskId: number,
  title: string,
  overrides: Partial<DashboardStreak> = {},
): DashboardStreak {
  return {
    taskId,
    title,
    currentStreak: 3,
    longestStreak: 5,
    lastCompletedOn: TODAY,
    nextOccurrenceOn: '2026-11-20',
    ...overrides,
  };
}

/** A series as the server keeps it: an earlier occurrence, done, and the open one after it. */
function series(id: number, title: string, overrides: Partial<ApiTask> = {}): ApiTask[] {
  return [
    apiTask(id, title, { isDone: true, doneAt: '2026-11-18T01:00:00.000Z', ...overrides }),
    apiTask(id + 1, title, overrides),
  ];
}

const MORNING_REVIEW = apiTask(41, 'Morning review');

// Error bodies from task-streaks.routes.ts, require-auth.middleware.ts and error-handler.middleware.ts.
const NOT_FOUND = { error: 'Task not found', code: 'task-not-found' };
const TOKEN_REJECTED = { error: 'Token invalid or expired' };
const SERVER_ERROR = { error: 'Internal server error' };

const status = (code: number, statusText = 'Error') => ({ status: code, statusText });

describe('Task Streaks integration (streak badge, detail and dashboard + API)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.fixture.nativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const text = (selector: string) => el(selector)?.textContent?.trim().replace(/\s+/g, ' ') ?? '';

  const streakSection = () => el('app-dashboard-streaks');
  const streakRows = () => all('app-dashboard-streaks .row');
  const rowTitles = () =>
    streakRows().map((row) => row.querySelector('.title')?.textContent?.trim());

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function click(selector: string | HTMLElement): Promise<void> {
    (typeof selector === 'string' ? el(selector) : selector).click();
    await settle();
  }

  /** Signs in the way a page load does: a stored token that GET /api/auth/me accepts. */
  async function startSignedIn(): Promise<void> {
    localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    http.expectOne(`${AUTH_API}/me`).flush(USER);
  }

  function expectTaskStreak(taskId: number): TestRequest {
    const req = http.expectOne(`${TASKS_API}/${taskId}/streak`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    return req;
  }

  function expectDashboardStreaks(): TestRequest {
    const req = http.expectOne(DASHBOARD_STREAKS);
    expect(req.request.method).toBe('GET');
    return req;
  }

  /** The Streaks section looks up each series' open occurrence among the repeating tasks. */
  function expectRecurringTasks(): TestRequest {
    return http.expectOne(
      (r) => r.method === 'GET' && r.url === TASKS_API && r.params.get('recurring') === 'true',
    );
  }

  /** The badge tooltip's lines; it is a CDK overlay outside the page. */
  const tooltipLines = () =>
    [...document.querySelectorAll('.cdk-overlay-container .tooltip .line')].map((line) =>
      line.textContent?.trim(),
    );

  /** The streak detail's 14 cells, oldest first, as their state. */
  const stripStates = () => all('app-streak-detail ol.strip .cell').map((c) => c.dataset['state']);

  /** Opens a task's edit page and answers everything but its streak. */
  async function openTask(task: ApiTask = MORNING_REVIEW): Promise<void> {
    await harness.navigateByUrl(`/projects/${CAPSTONE.id}/tasks/${task.id}/edit`);
    await settle();
    answerEditPage(task);
    await settle();
  }

  /** Answers the edit page's project, label and task requests. */
  function answerEditPage(task: ApiTask): void {
    http
      .match((req) => req.url === PROJECTS_API)
      .forEach((req) =>
        req.flush(req.request.params.get('isArchived') === 'true' ? [] : [CAPSTONE]),
      );
    http.match(LABELS_API).forEach((req) => req.flush([]));
    http.expectOne(`${TASKS_API}/${task.id}`).flush(task);
  }

  /** Opens the project's task list and answers everything but the streaks. */
  async function openProjectList(tasks: ApiTask[]): Promise<void> {
    await harness.navigateByUrl(`/projects/${CAPSTONE.id}/tasks`);
    await settle();
    http.expectOne(LABELS_API).flush([]);
    http.expectOne(`${PROJECTS_API}/${CAPSTONE.id}`).flush(CAPSTONE);
    http
      .expectOne((r) => r.url === TASKS_API && r.params.get('projectId') === `${CAPSTONE.id}`)
      .flush(tasks);
    await settle();
  }

  /** Opens /dashboard and answers its other sections, leaving the Streaks requests open. */
  async function openDashboard(): Promise<void> {
    await harness.navigateByUrl('/streak');
    await settle();
    http.expectOne((r) => r.url === `${DASHBOARD_API}/current-upcoming-tasks`).flush({ tasks: [] });
    http.expectOne(`${DASHBOARD_API}/overdue-tasks`).flush({ tasks: [] });
    http.match((req) => req.url === PROJECTS_API).forEach((req) => req.flush([]));
  }

  async function answerStreaks(streaks: DashboardStreak[], tasks: ApiTask[]): Promise<void> {
    expectDashboardStreaks().flush({ streaks });
    expectRecurringTasks().flush(tasks);
    await settle();
  }

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideSessionRestore(),
        { provide: DASHBOARD_NOW, useValue: () => new Date(NOW) },
        { provide: STREAKS_NOW, useValue: () => new Date(NOW) },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    try {
      // Opening a project stamps it for the dashboard's "Recently accessed" sort.
      http?.match((r) => r.url.endsWith('/access'));
      if (http) http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  // FE-STR-01
  describe("Show a task's streak", () => {
    it('shows the current streak, longest streak and next occurrence date as returned', async () => {
      await startSignedIn();
      await openTask();
      expect(text('app-streak-detail [role="status"]')).toBe('Loading streak…');

      expectTaskStreak(41).flush(
        taskStreak(41, {
          currentStreak: 4,
          longestStreak: 7,
          lastCompletedOn: TODAY,
          nextOccurrenceOn: '2026-11-20',
        }),
      );
      await settle();

      expect(text('app-streak-detail .current')).toBe('4 days');
      expect(text('app-streak-detail .longest')).toBe('7 days');
      expect(text('app-streak-detail .last')).toBe('Nov 19');
      expect(text('app-streak-detail .next')).toBe('Nov 20');
      expect(text('app-streak-detail app-streak-badge .count')).toBe('4 days');
      expect(all('app-streak-detail ol.strip .cell')).toHaveLength(14);
      // The rest of the edit page is unaffected.
      expect(el<HTMLInputElement>('#task-title').value).toBe('Morning review');
    });

    // Case 2
    it('shows the longest streak in the tooltip and the last 14 periods in the detail', async () => {
      await startSignedIn();
      await openTask();
      expectTaskStreak(41).flush(
        taskStreak(41, {
          currentStreak: 4,
          longestStreak: 7,
          lastCompletedOn: '2026-11-18',
          nextOccurrenceOn: TODAY,
        }),
      );
      await settle();

      const badge = el('app-streak-detail app-streak-badge .badge');
      // Screen readers get the tooltip's text through aria-describedby at all times.
      const description = document.getElementById(badge.getAttribute('aria-describedby')!);
      expect(description?.textContent?.trim()).toBe(
        'Longest streak: 7 days. Last completed: Nov 18. Due today. Complete it to keep the streak.',
      );
      expect(tooltipLines()).toEqual([]);

      badge.dispatchEvent(new Event('mouseenter'));
      await settle();
      expect(tooltipLines()).toEqual([
        'Longest streak: 7 days',
        'Last completed: Nov 18',
        'Due today. Complete it to keep the streak',
      ]);
      badge.dispatchEvent(new Event('mouseleave'));
      await settle();
      expect(tooltipLines()).toEqual([]);

      // Keyboard users get the same tooltip on focus.
      badge.dispatchEvent(new Event('focus'));
      await settle();
      expect(tooltipLines()[0]).toBe('Longest streak: 7 days');
      badge.dispatchEvent(new Event('blur'));
      await settle();

      expect(text('app-streak-detail .longest')).toBe('7 days');
      expect(el('app-streak-detail ol.strip').getAttribute('aria-label')).toBe(
        'Last 14 periods, oldest first',
      );
      // The 4-day run ending yesterday, today still open, and nothing known before the run.
      expect(stripStates()).toEqual([
        ...Array(9).fill('unknown'),
        'done',
        'done',
        'done',
        'done',
        'open',
      ]);
      const cells = all('app-streak-detail ol.strip .cell');
      expect(cells[0].getAttribute('aria-label')).toBe('Nov 6: No record');
      expect(cells[9].getAttribute('aria-label')).toBe('Nov 15: Done');
      expect(cells[13].getAttribute('aria-label')).toBe('Nov 19: Open');
    });

    it('shows a clear "No streak yet" state for a streak of 0', async () => {
      await startSignedIn();
      await openTask();

      expectTaskStreak(41).flush(
        taskStreak(41, {
          currentStreak: 0,
          longestStreak: 0,
          lastCompletedOn: null,
          nextOccurrenceOn: null,
        }),
      );
      await settle();

      expect(text('app-streak-detail .current')).toBe('No streak yet');
      expect(text('app-streak-detail .last')).toBe('Not yet');
      expect(text('app-streak-detail app-streak-badge .count')).toBe('No streak yet');
      expect(el('app-streak-detail app-streak-badge .badge').getAttribute('aria-label')).toBe(
        'No streak yet',
      );
    });

    it('shows the badge with its streak on repeating tasks in the project list only', async () => {
      await startSignedIn();
      await harness.navigateByUrl(`/projects/${CAPSTONE.id}/tasks`);
      await settle();
      http.expectOne(LABELS_API).flush([]);
      http.expectOne(`${PROJECTS_API}/${CAPSTONE.id}`).flush(CAPSTONE);
      http
        .expectOne((r) => r.url === TASKS_API && r.params.get('projectId') === `${CAPSTONE.id}`)
        .flush([MORNING_REVIEW, apiTask(50, 'Submit essay', { recurrence: null })]);
      await settle();

      expectTaskStreak(41).flush(
        taskStreak(41, { currentStreak: 2, lastCompletedOn: '2026-11-18' }),
      );
      http.expectNone(`${TASKS_API}/50/streak`);
      await settle();

      const [repeating, once] = all('app-task-item');
      const badge = repeating.querySelector<HTMLElement>('app-streak-badge .badge')!;
      expect(badge.querySelector('.count')?.textContent?.trim()).toBe('2 days');
      expect(badge.getAttribute('aria-label')).toBe('Streak: 2 days, at risk');
      expect(badge.classList).toContain('at-risk');
      expect(badge.tabIndex).toBe(0);
      expect(once.querySelector('app-streak-badge')).toBeNull();
    });
  });

  // Case 3 (FE-STR-01)
  describe('At-risk styling', () => {
    it("marks the badge and detail at risk while today's occurrence is open", async () => {
      await startSignedIn();
      await openTask();
      expectTaskStreak(41).flush(
        taskStreak(41, { lastCompletedOn: '2026-11-18', nextOccurrenceOn: TODAY }),
      );
      await settle();

      const badge = el('app-streak-detail app-streak-badge .badge');
      expect(badge.classList).toContain('at-risk');
      expect(badge.getAttribute('aria-label')).toBe('Streak: 4 days, at risk');
      expect(text('app-streak-detail .risk')).toBe(
        'Due today. Complete it to keep your streak going.',
      );
      expect(text('app-streak-detail .next')).toBe('Nov 19');
    });

    it("drops the at-risk styling once today's occurrence is done", async () => {
      await startSignedIn();
      await openTask();
      expectTaskStreak(41).flush(taskStreak(41, { lastCompletedOn: TODAY }));
      await settle();

      const badge = el('app-streak-detail app-streak-badge .badge');
      expect(badge.classList).not.toContain('at-risk');
      expect(badge.getAttribute('aria-label')).toBe('Streak: 4 days');
      expect(el('app-streak-detail .risk')).toBeNull();
      expect(text('app-streak-detail .next')).toBe('Nov 20');
      expect(stripStates().at(-1)).toBe('done');
    });

    it('shows a missed occurrence as an ended streak, not at risk', async () => {
      await startSignedIn();
      await openTask();
      // Done on the 17th, missed on the 18th: the server has reset the current streak.
      expectTaskStreak(41).flush(
        taskStreak(41, { currentStreak: 0, longestStreak: 7, lastCompletedOn: '2026-11-17' }),
      );
      await settle();

      const badge = el('app-streak-detail app-streak-badge .badge');
      expect(badge.classList).not.toContain('at-risk');
      expect(badge.classList).toContain('cold');
      expect(text('app-streak-detail .current')).toBe('No streak yet');
      expect(el('app-streak-detail .risk')).toBeNull();
      expect(text('app-streak-detail .note')).toBe(
        'The last occurrence was missed. Complete the next one to start a new streak.',
      );
      expect(el('app-streak-detail .next')).toBeNull();
      expect(stripStates().slice(-3)).toEqual(['done', 'missed', 'open']);
    });
  });

  // FE-STR-02
  describe('Show dashboard streaks', () => {
    it('renders streaks in response order with title and counts, each opening its task', async () => {
      await startSignedIn();
      await openDashboard();
      expect(text('app-dashboard-streaks [role="status"]')).toBe('Loading streaks…');

      await answerStreaks(
        [
          dashboardStreak(10, 'Read', { currentStreak: 6, longestStreak: 9 }),
          dashboardStreak(20, 'Stretch', { currentStreak: 2, longestStreak: 2 }),
          dashboardStreak(30, 'Journal', { currentStreak: 1, longestStreak: 4 }),
        ],
        [...series(10, 'Read'), ...series(20, 'Stretch'), ...series(30, 'Journal')],
      );

      expect(rowTitles()).toEqual(['Read', 'Stretch', 'Journal']);
      expect(streakRows().map((row) => row.querySelector('.count')?.textContent?.trim())).toEqual([
        '6 days',
        '2 days',
        '1 day',
      ]);
      expect(streakRows().map((row) => row.querySelector('.sub')?.textContent?.trim())).toEqual([
        'Longest 9 days',
        'Longest 2 days',
        'Longest 4 days',
      ]);

      await click(streakRows()[1].querySelector<HTMLElement>('a.title')!);
      expect(router.url).toBe(`/projects/${CAPSTONE.id}/tasks/21/edit`);
      // The edit page loads; its own requests are not under test here.
      http.match(() => true);
    });

    it('moves streaks at risk today ahead of the others, as the dashboard requires', async () => {
      await startSignedIn();
      await openDashboard();
      await answerStreaks(
        [
          dashboardStreak(10, 'Read'),
          dashboardStreak(20, 'Stretch', {
            lastCompletedOn: '2026-11-18',
            nextOccurrenceOn: TODAY,
          }),
        ],
        [...series(10, 'Read'), ...series(20, 'Stretch')],
      );

      expect(rowTitles()).toEqual(['Stretch', 'Read']);
      expect(text('app-dashboard-streaks h2 .visually-hidden')).toBe(
        ', 2 active streaks, 1 at risk',
      );
    });

    it('shows the empty state for { "streaks": [] }', async () => {
      await startSignedIn();
      await openDashboard();
      await answerStreaks([], []);

      expect(streakRows()).toHaveLength(0);
      expect(text('app-dashboard-streaks .empty')).toBe(
        'No active streaks. Complete a repeating task to start one.',
      );
    });
  });

  // FE-STR-03
  describe('Refresh streaks after completing a task', () => {
    it('completes from the dashboard and shows the new count without a page reload', async () => {
      await startSignedIn();
      await openDashboard();
      await answerStreaks(
        [dashboardStreak(20, 'Stretch', { currentStreak: 2, lastCompletedOn: '2026-11-18' })],
        series(20, 'Stretch'),
      );
      expect(text('app-dashboard-streaks .row .count')).toBe('2 days');

      await click('app-dashboard-streaks button.complete');
      const put = http.expectOne(`${TASKS_API}/21`);
      expect(put.request.method).toBe('PUT');
      expect(put.request.body).toEqual({ isDone: true, doneAt: NOW });
      put.flush({ id: 21, isDone: true, doneAt: NOW, position: 1 });
      await settle();

      await answerStreaks(
        [dashboardStreak(20, 'Stretch', { currentStreak: 3, lastCompletedOn: TODAY })],
        [
          ...series(20, 'Stretch').map((task) => ({ ...task, isDone: true, doneAt: NOW })),
          apiTask(22, 'Stretch', { dueDate: '2026-11-20', scheduledDate: '2026-11-20' }),
        ],
      );

      expect(text('app-dashboard-streaks .row .count')).toBe('3 days');
      expect(text('app-dashboard-streaks .row .done')).toBe('Done today');
      expect(el('app-dashboard-streaks button.complete')).toBeNull();
      expect(text('app-dashboard-streaks .notice')).toBe('“Stretch” is done. Streak kept.');
      expect(router.url).toBe('/streak');

      // The row now opens the next occurrence, whose detail shows the new count and date.
      const next = apiTask(22, 'Stretch', { dueDate: '2026-11-20', scheduledDate: '2026-11-20' });
      const link = el<HTMLAnchorElement>('app-dashboard-streaks a.title');
      expect(link.getAttribute('href')).toBe(`/projects/${CAPSTONE.id}/tasks/22/edit`);
      await click(link);
      answerEditPage(next);
      await settle();
      expectTaskStreak(22).flush(
        taskStreak(22, {
          currentStreak: 3,
          longestStreak: 5,
          lastCompletedOn: TODAY,
          nextOccurrenceOn: '2026-11-20',
        }),
      );
      await settle();

      expect(text('app-streak-detail .current')).toBe('3 days');
      expect(text('app-streak-detail .last')).toBe('Nov 19');
      expect(text('app-streak-detail .next')).toBe('Nov 20');
      expect(el<HTMLInputElement>('#task-due-date').value).toBe('2026-11-20');
    });

    it('completes from the home task list and requests the streak again', async () => {
      await startSignedIn();
      await harness.navigateByUrl('/home');
      await settle();
      http.expectOne(`${PROJECTS_API}?isArchived=false`).flush([CAPSTONE]);
      http.expectOne(`${PROJECTS_API}?isArchived=true`).flush([]);
      http
        .expectOne((r) => r.url === TASKS_API && !r.params.has('recurring'))
        .flush([MORNING_REVIEW]);
      await settle();
      expectTaskStreak(41).flush(
        taskStreak(41, { currentStreak: 4, lastCompletedOn: '2026-11-18' }),
      );
      await settle();

      const row = all('app-all-tasks .task').find((item) =>
        item.textContent?.includes('Morning review'),
      )!;
      expect(row.querySelector('app-streak-badge .count')?.textContent?.trim()).toBe('4 days');
      row.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
      http
        .expectOne({ method: 'PUT', url: `${TASKS_API}/41` })
        .flush({ id: 41, isDone: true, doneAt: NOW, position: 1 });
      await settle();

      expectTaskStreak(41).flush(taskStreak(41, { currentStreak: 5, lastCompletedOn: TODAY }));
      await settle();

      const badge = row.querySelector<HTMLElement>('app-streak-badge .badge')!;
      expect(badge.querySelector('.count')?.textContent?.trim()).toBe('5 days');
      expect(badge.classList).not.toContain('at-risk');
    });
  });

  // FE-STR-04
  describe('Handle streak request failures', () => {
    it('shows a visible error on a 404 and keeps the rest of the edit page working', async () => {
      await startSignedIn();
      await openTask();

      expectTaskStreak(41).flush(NOT_FOUND, status(404));
      await settle();

      expect(text('app-streak-detail [role="alert"] p')).toBe("Couldn't load this streak.");
      expect(el<HTMLInputElement>('#task-title').value).toBe('Morning review');
      expect(el('app-task-form form')).toBeTruthy();
    });

    it('shows an error on a 500 and reloads the streak from Try again', async () => {
      await startSignedIn();
      await openTask();

      expectTaskStreak(41).flush(SERVER_ERROR, status(500));
      await settle();
      expect(text('app-streak-detail [role="alert"] p')).toBe("Couldn't load this streak.");

      await click('app-streak-detail .retry');
      expectTaskStreak(41).flush(taskStreak(41));
      await settle();

      expect(el('app-streak-detail [role="alert"]')).toBeNull();
      expect(text('app-streak-detail .current')).toBe('4 days');
    });

    it('keeps the other dashboard sections when the streaks fail, and retries', async () => {
      await startSignedIn();
      await openDashboard();
      expectDashboardStreaks().flush(SERVER_ERROR, status(500));
      expect(expectRecurringTasks().cancelled).toBe(true);
      await settle();

      expect(text('app-dashboard-streaks [role="alert"] p')).toBe(
        "We couldn't load your streaks. Please try again.",
      );
      expect(text('app-overdue-tasks .empty')).toBe('Nothing here');

      await click('app-dashboard-streaks .retry');
      await answerStreaks([dashboardStreak(10, 'Read')], series(10, 'Read'));

      expect(streakSection().querySelector('[role="alert"]')).toBeNull();
      expect(rowTitles()).toEqual(['Read']);
    });

    // Case 6
    it('hides the badge when its streak request fails and keeps the task list working', async () => {
      await startSignedIn();
      await openProjectList([
        MORNING_REVIEW,
        apiTask(42, 'Stretch', { recurrence: 'weekly', recurrenceDays: [4] }),
        apiTask(50, 'Submit essay', { recurrence: null }),
      ]);

      expectTaskStreak(41).flush(SERVER_ERROR, status(500));
      expectTaskStreak(42).flush(
        taskStreak(42, { currentStreak: 3, longestStreak: 3, lastCompletedOn: '2026-11-12' }),
      );
      await settle();

      const [failed, weekly, once] = all('app-task-item');
      expect(failed.querySelector('app-streak-badge .badge')).toBeNull();
      expect(weekly.querySelector('app-streak-badge .count')?.textContent?.trim()).toBe('3 weeks');
      expect(once.querySelector('app-streak-badge')).toBeNull();
      expect(all('app-task-item .title').map((t) => t.textContent?.trim())).toEqual([
        'Morning review',
        'Stretch',
        'Submit essay',
      ]);
      // The list itself reports no error and stays usable.
      expect(el('app-task-list .load-error')).toBeNull();
      expect(el('app-task-list [role="alert"]')).toBeNull();
      expect(el<HTMLButtonElement>('app-task-list button.new').disabled).toBe(false);
    });

    it('clears the session and opens /login on a 401 for a list badge', async () => {
      await startSignedIn();
      await openProjectList([MORNING_REVIEW]);

      expectTaskStreak(41).flush(TOKEN_REJECTED, status(401, 'Unauthorized'));
      await settle();

      expect(router.url).toBe('/login');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });

    it('clears the session and opens /login on a 401', async () => {
      await startSignedIn();
      await openTask();

      expectTaskStreak(41).flush(TOKEN_REJECTED, status(401));
      await settle();

      expect(router.url).toBe('/login');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });
});
