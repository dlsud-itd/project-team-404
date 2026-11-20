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
import { providePriorityLevels } from '../../../../src/app/features/settings/state/priorities.store';
import { provideUserSettings } from '../../../../src/app/features/settings/state/settings.store';
import type { ApiTask } from '../../../../src/app/features/tasks/shared/types/task.types';
import { environment } from '../../../../src/environments/environment';

/**
 * Sorting & Filtering frontend integration tests (Sprint 5: FE-SF rows).
 *
 * The app runs through its real /projects/:projectId/tasks and /projects routes behind authGuard,
 * with the real task filter bar, sort menu (CDK menu), TaskQueryStore with its real 250 ms
 * debounce, TaskService, TasksStore, LabelService, the project filter bar, ProjectService,
 * ProjectsStore and authInterceptor. providePriorityLevels() and provideUserSettings() are
 * registered as in app.config.ts, so signing in loads the user's levels and settings. The user is
 * signed in by restoring a stored token and answering GET /api/auth/me.
 *
 * Only the network is faked. Bodies follow the backend: toTaskModel, toProjectModel,
 * toLabelModel, toPriorityModel, the validate-request 400 body for GET /api/tasks ("Invalid task
 * filters" with details from task-filter.validator), require-auth's 401 and the error handler's
 * 500. The debounce is driven with Vitest's fake setInterval and Date, which rxjs's debounceTime
 * uses, so the router and Angular keep their real timers.
 */

const API = `${environment.apiBaseUrl}/api`;
const AUTH_API = `${API}/auth`;
const TASKS_API = `${API}/tasks`;
const PROJECTS_API = `${API}/projects`;
const LABELS_API = `${API}/labels`;
const PRIORITIES_API = `${API}/priorities`;
const SETTINGS_API = `${API}/settings`;
const TOKEN = 'session-token';
/** TASK_QUERY_DEBOUNCE_MS's default. */
const DEBOUNCE_MS = 250;
/** What rxjs's debounceTime reads: it schedules with setInterval and checks Date.now(). */
const DEBOUNCE_TIMERS: ('setInterval' | 'clearInterval' | 'Date')[] = [
  'setInterval',
  'clearInterval',
  'Date',
];

const USER = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 1,
};

const STAMPS = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' };

/** GET /api/settings as toUserSettingsModel sends it. */
const SETTINGS = {
  userId: USER.id,
  dashboardTaskLimit: 5,
  dashboardProjectLimit: 5,
  fontSize: 'medium',
  fontFamily: 'system',
  ...STAMPS,
};

type ApiPriority = {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
  isDefault: boolean;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
};

/** A priority level as toPriorityModel sends it. */
function level(id: number, name: string, color: string, sortOrder: number): ApiPriority {
  return { id, name, color, sortOrder, isDefault: name === 'Medium', taskCount: 0, ...STAMPS };
}

// The built-in levels plus one of the user's own, which the task filter API does not know yet.
const HIGH = level(1, 'High', '#D84A4A', 0);
const MEDIUM = level(2, 'Medium', '#D59B38', 1);
const LOW = level(3, 'Low', '#6E9F79', 2);
const URGENT = level(11, 'Urgent', '#B91C1C', 3);
const LEVELS = [HIGH, MEDIUM, LOW, URGENT];

/** A label as toLabelModel sends it. */
function label(id: number, name: string, color: string, sortOrder: number) {
  return { id, name, color, sortOrder, isArchived: false, archivedAt: null, ...STAMPS };
}

const PLANNING = label(21, 'Planning', '#2563EB', 0);
const FOLLOW_UP = label(22, 'Follow-up', '#D97706', 1);
const LABELS = [PLANNING, FOLLOW_UP];

/** A project as toProjectModel sends it. */
function project(
  id: number,
  name: string,
  overrides: Partial<{
    color: string | null;
    isInbox: boolean;
    isFavorite: boolean;
    isArchived: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }> = {},
) {
  return {
    id,
    name,
    description: null,
    color: null,
    isInbox: false,
    isFavorite: false,
    isArchived: false,
    sortOrder: id,
    ...STAMPS,
    ...overrides,
  };
}

const INBOX = project(1, 'Inbox', { isInbox: true, sortOrder: 0 });
const CAPSTONE = project(10, 'Capstone', { color: '#2563EB', isFavorite: true, sortOrder: 1 });

/** A task as toTaskModel sends it. */
function apiTask(
  id: number,
  title: string,
  priority: ApiPriority = MEDIUM,
  overrides: Partial<ApiTask> = {},
): ApiTask {
  return {
    id,
    projectId: CAPSTONE.id,
    title,
    description: null,
    priority: {
      id: priority.id,
      name: priority.name,
      color: priority.color,
      sortOrder: priority.sortOrder,
    },
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

const REPORT = apiTask(31, 'Write report', HIGH, {
  dueDate: '2026-11-18',
  labels: [{ id: PLANNING.id, name: PLANNING.name, color: PLANNING.color }],
});
const SLIDES = apiTask(32, 'Make slides', LOW, {
  labels: [{ id: PLANNING.id, name: PLANNING.name, color: PLANNING.color }],
});
const NOTES = apiTask(33, 'Read notes', MEDIUM);
const ALL_TASKS = [REPORT, SLIDES, NOTES];

/** The params TaskService always sends for a project's list. */
const BASE_PARAMS = { projectId: `${CAPSTONE.id}`, status: 'all', pageSize: '100' };

// Error bodies from validate-request.middleware.ts, require-auth and error-handler.middleware.ts.
const UNKNOWN_PRIORITY = {
  error: 'Invalid task filters',
  details: [
    {
      field: 'priorities',
      message: 'Priorities must be comma-separated low, medium, or high values',
    },
  ],
};
const TOKEN_REJECTED = { error: 'Token invalid or expired' };
const SERVER_ERROR = { error: 'Internal server error' };

const status = (code: number, statusText = 'Error') => ({ status: code, statusText });

describe('Sort & filter integration (task list, projects page + API)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.fixture.nativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const clean = (value: string | null | undefined) => value?.trim().replace(/\s+/g, ' ') ?? '';
  const text = (selector: string) => clean(el(selector)?.textContent);
  const titles = () => all('app-task-item .title').map((t) => clean(t.textContent));
  const cardNames = () => all('app-project-card .tasks-link').map((a) => clean(a.textContent));

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function press(target: HTMLElement | undefined): Promise<void> {
    expect(target, 'element to press').toBeTruthy();
    target!.click();
    await settle();
  }

  /** The URL's query params, decoded. */
  function urlParams(): Record<string, string> {
    return router.parseUrl(router.url).queryParams as Record<string, string>;
  }

  /** Every param a request carries. */
  function paramsOf(req: TestRequest): Record<string, string | null> {
    const { params } = req.request;
    return Object.fromEntries(params.keys().map((key) => [key, params.get(key)]));
  }

  function configure(): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideSessionRestore(),
        providePriorityLevels(),
        provideUserSettings(),
      ],
    });
  }

  /** Signs in the way a page load does: a stored token that GET /api/auth/me accepts. */
  async function startSignedIn(): Promise<void> {
    localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    http.expectOne(`${AUTH_API}/me`).flush(USER);
    await settle();
    http.match(PRIORITIES_API).forEach((req) => req.flush(LEVELS));
    http.match(SETTINGS_API).forEach((req) => req.flush(SETTINGS));
    await settle();
  }

  /** Like pressing F5 on `url`: a fresh app, signed in again from the stored token. */
  async function reload(url: string): Promise<void> {
    http.verify();
    TestBed.resetTestingModule();
    configure();
    await startSignedIn();
    await harness.navigateByUrl(url);
    await settle();
  }

  // ---- Task list ----

  /** The one pending GET /api/tasks for the project, with the session token. */
  function expectTaskList(): TestRequest {
    const req = http.expectOne(
      (r) =>
        r.method === 'GET' && r.url === TASKS_API && r.params.get('projectId') === `${CAPSTONE.id}`,
    );
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    return req;
  }

  function pendingTaskLists(): TestRequest[] {
    return http.match((r) => r.method === 'GET' && r.url === TASKS_API);
  }

  /** Answers the labels and project requests the task list sends when it opens. */
  function answerListPage(): void {
    http.expectOne(LABELS_API).flush(LABELS);
    http.expectOne(`${PROJECTS_API}/${CAPSTONE.id}`).flush(CAPSTONE);
  }

  /** Opens a task-list URL and returns its first GET /api/tasks, not yet answered. */
  async function openTasks(url = `/projects/${CAPSTONE.id}/tasks`): Promise<TestRequest> {
    await harness.navigateByUrl(url);
    await settle();
    answerListPage();
    return expectTaskList();
  }

  /** Opens the plain task list and shows `tasks`. */
  async function openTaskList(tasks: ApiTask[] = ALL_TASKS): Promise<void> {
    (await openTasks()).flush(tasks);
    await settle();
  }

  /** Reloads `url` and returns its first GET /api/tasks, not yet answered. */
  async function reloadTasks(url: string): Promise<TestRequest> {
    await reload(url);
    answerListPage();
    return expectTaskList();
  }

  /**
   * Runs `steps` as quick user input, then lets the list's debounce elapse. Only setInterval and
   * Date are faked, which debounceTime uses; Angular and the router keep their real timers.
   */
  async function changeFilters(steps: () => Promise<void>): Promise<void> {
    vi.useFakeTimers({ toFake: DEBOUNCE_TIMERS });
    try {
      await steps();
      vi.advanceTimersByTime(DEBOUNCE_MS);
    } finally {
      vi.useRealTimers();
    }
    await settle();
  }

  function chip(name: string): HTMLElement | undefined {
    return all('app-task-filter-bar .chip').find((c) => clean(c.textContent).startsWith(name));
  }

  function chipTexts(): string[] {
    return all('app-task-filter-bar .chip .chip-text').map((c) => clean(c.textContent));
  }

  /** Opens a filter chip's panel unless it is already open. */
  async function openChip(name: string): Promise<void> {
    const button = chip(name);
    if (button?.getAttribute('aria-expanded') !== 'true') await press(button);
  }

  /** Clicks the checkbox or radio labelled `option` in the open panel `panelId`. */
  async function pick(panelId: string, option: string): Promise<void> {
    const row = all(`#${panelId} .option`).find((o) => clean(o.textContent) === option);
    await press(row?.querySelector('input') ?? undefined);
  }

  async function setRange(bound: 'From' | 'To', value: string): Promise<void> {
    const field = all('app-task-filter-bar .range label')
      .find((l) => clean(l.textContent).startsWith(bound))!
      .querySelector('input')!;
    field.value = value;
    field.dispatchEvent(new Event('change'));
    await settle();
  }

  /** The sort trigger's text, e.g. "Sort: Due date". */
  function sortText(host = 'app-task-list'): string {
    return text(`${host} app-sort-menu .trigger`);
  }

  function directionButton(host = 'app-task-list'): HTMLElement | null {
    return el(`${host} app-sort-menu .direction`);
  }

  /** Opens the sort menu (a CDK overlay outside the page) and picks `option`. */
  async function sortBy(option: string, host = 'app-task-list'): Promise<void> {
    await press(el(`${host} app-sort-menu .trigger`));
    const items = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
    await press(items.find((item) => clean(item.textContent) === option));
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    configure();
  });

  afterEach(() => {
    vi.useRealTimers();
    try {
      if (http) http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  // Case 1
  describe('Choosing filters', () => {
    // FE-SF-01, FE-SF-02
    it('sends two priorities and a label as query params, writes them to the URL and shows the response', async () => {
      await startSignedIn();
      await openTaskList();
      expect(titles()).toEqual(['Write report', 'Make slides', 'Read notes']);

      await changeFilters(async () => {
        await openChip('Priority');
        await pick('task-filter-priority', 'High');
        await pick('task-filter-priority', 'Low');
        await openChip('Labels');
        await pick('task-filter-labels', 'Planning');
      });

      const req = expectTaskList();
      // Two levels go in `priorities`; a single label uses the Sprint 3 `labelId`.
      expect(paramsOf(req)).toEqual({ ...BASE_PARAMS, priorities: 'high,low', labelId: '21' });
      req.flush([REPORT, SLIDES]);
      await settle();

      expect(urlParams()).toEqual({ priorities: 'high,low', labelIds: '21' });
      expect(titles()).toEqual(['Write report', 'Make slides']);
      expect(chipTexts()).toEqual([
        'Priority: High, Low',
        'Labels: Planning',
        'Due',
        'Repeat',
        'Status',
      ]);
      expect(text('app-task-filter-bar .count')).toBe('2 filters');
    });

    // FE-SF-02
    it('sends any/all label matching, overdue, no-date, repeat and custom due-date bounds', async () => {
      await startSignedIn();
      await openTaskList();

      await changeFilters(async () => {
        await openChip('Labels');
        await pick('task-filter-labels', 'Planning');
        await pick('task-filter-labels', 'Follow-up');
        await pick('task-filter-labels', 'All of these labels');
        await openChip('Due');
        await pick('task-filter-due', 'Overdue');
        await openChip('Repeat');
        await pick('task-filter-repeat', 'Repeating');
      });
      let req = expectTaskList();
      expect(paramsOf(req)).toEqual({
        ...BASE_PARAMS,
        labelIds: '21,22',
        labelMatch: 'all',
        overdue: 'true',
        recurring: 'true',
      });
      req.flush([]);
      await settle();
      expect(urlParams()).toEqual({
        labelIds: '21,22',
        labelMatch: 'all',
        due: 'overdue',
        recurring: 'true',
      });

      await changeFilters(async () => {
        await openChip('Due');
        await pick('task-filter-due', 'No date');
        await openChip('Repeating');
        await pick('task-filter-repeat', 'One-time');
      });
      req = expectTaskList();
      expect(paramsOf(req)).toEqual({
        ...BASE_PARAMS,
        labelIds: '21,22',
        labelMatch: 'all',
        hasDueDate: 'false',
        recurring: 'false',
      });
      req.flush([NOTES]);
      await settle();
      expect(titles()).toEqual(['Read notes']);

      // A custom range sends both inclusive bounds.
      await changeFilters(async () => {
        await openChip('Due');
        await pick('task-filter-due', 'Custom range…');
        await setRange('From', '2026-11-16');
        await setRange('To', '2026-11-22');
      });
      req = expectTaskList();
      expect(paramsOf(req)).toMatchObject({ dueFrom: '2026-11-16', dueTo: '2026-11-22' });
      expect(req.request.params.has('hasDueDate')).toBe(false);
      req.flush([REPORT]);
      await settle();
      expect(urlParams()).toMatchObject({
        due: 'custom',
        dueFrom: '2026-11-16',
        dueTo: '2026-11-22',
      });
      expect(chip('Due')?.textContent).toContain('Nov 16');
    });

    // FE-SF-05
    it('reports a range that ends before it starts and does not send the bounds', async () => {
      await startSignedIn();
      await openTaskList();

      await changeFilters(async () => {
        await openChip('Due');
        await pick('task-filter-due', 'Custom range…');
        await setRange('From', '2026-11-22');
        await setRange('To', '2026-11-16');
      });

      expect(text('#task-filter-range-error')).toBe('“From” must be on or before “To”.');
      // The server would refuse dueFrom > dueTo, so the list asks without the range.
      const req = expectTaskList();
      expect(paramsOf(req)).toEqual(BASE_PARAMS);
      req.flush(ALL_TASKS);
      await settle();
    });
  });

  // Case 2
  describe('Reloading a filtered URL', () => {
    // FE-SF-01, FE-SF-02, FE-SF-03
    it('restores the chips and the sort menu and sends the same request', async () => {
      await startSignedIn();
      await openTaskList();

      await changeFilters(async () => {
        await openChip('Priority');
        await pick('task-filter-priority', 'High');
        await pick('task-filter-priority', 'Low');
        await openChip('Labels');
        await pick('task-filter-labels', 'Planning');
        await pick('task-filter-labels', 'Follow-up');
        await pick('task-filter-labels', 'All of these labels');
        await openChip('Due');
        await pick('task-filter-due', 'Overdue');
        await openChip('Status');
        await pick('task-filter-status', 'Active');
        await sortBy('Due date');
        await press(directionButton()!);
      });
      const before = expectTaskList();
      const sent = paramsOf(before);
      expect(sent).toEqual({
        ...BASE_PARAMS,
        status: 'active',
        priorities: 'high,low',
        labelIds: '21,22',
        labelMatch: 'all',
        overdue: 'true',
        orderBy: 'dueDate',
        orderDirection: 'desc',
      });
      before.flush([REPORT]);
      await settle();
      const url = router.url;

      const after = await reloadTasks(url);
      expect(paramsOf(after)).toEqual(sent);
      after.flush([REPORT]);
      await settle();

      expect(router.url).toBe(url);
      expect(chipTexts()).toEqual([
        'Priority: High, Low',
        'Labels (all): Planning, Follow-up',
        'Due: Overdue',
        'Repeat',
        'Status: Active',
      ]);
      expect(text('app-task-filter-bar .count')).toBe('4 filters');
      expect(sortText()).toBe('Sort: Due date');
      expect(directionButton()?.getAttribute('aria-pressed')).toBe('true');
      expect(titles()).toEqual(['Write report']);

      // The restored chips are live: their panels show the saved choices as checked.
      await openChip('Priority');
      const checked = all('#task-filter-priority .option')
        .filter((o) => o.querySelector<HTMLInputElement>('input')!.checked)
        .map((o) => clean(o.textContent));
      expect(checked).toEqual(['High', 'Low']);
    });
  });

  // Case 3
  describe('Clear all', () => {
    // FE-SF-01
    it('removes every filter param from the URL and the request, then refetches once', async () => {
      await startSignedIn();
      const first = await openTasks(
        `/projects/${CAPSTONE.id}/tasks?priorities=high&labelIds=21,22&labelMatch=all&due=none&recurring=false&status=completed`,
      );
      expect(paramsOf(first)).toEqual({
        ...BASE_PARAMS,
        status: 'completed',
        priority: 'high',
        labelIds: '21,22',
        labelMatch: 'all',
        hasDueDate: 'false',
        recurring: 'false',
      });
      first.flush([]);
      await settle();
      expect(text('app-task-filter-bar .count')).toBe('5 filters');

      await changeFilters(() => press(el('app-task-filter-bar button.clear')));

      const req = expectTaskList();
      expect(paramsOf(req)).toEqual(BASE_PARAMS);
      req.flush(ALL_TASKS);
      await settle();

      expect(router.url).toBe(`/projects/${CAPSTONE.id}/tasks`);
      expect(el('app-task-filter-bar .count')).toBeNull();
      expect(chipTexts()).toEqual(['Priority', 'Labels', 'Due', 'Repeat', 'Status']);
      expect(titles()).toEqual(['Write report', 'Make slides', 'Read notes']);
    });

    it('keeps the sort, which is not a filter', async () => {
      await startSignedIn();
      const first = await openTasks(
        `/projects/${CAPSTONE.id}/tasks?status=active&orderBy=title&orderDirection=desc`,
      );
      first.flush(ALL_TASKS);
      await settle();

      await changeFilters(() => press(el('app-task-filter-bar button.clear')));

      const req = expectTaskList();
      expect(paramsOf(req)).toEqual({ ...BASE_PARAMS, orderBy: 'title', orderDirection: 'desc' });
      req.flush(ALL_TASKS);
      await settle();
      expect(urlParams()).toEqual({ orderBy: 'title', orderDirection: 'desc' });
      expect(sortText()).toBe('Sort: Title');
    });
  });

  // Case 4
  describe('Sorting tasks', () => {
    const FIELDS = [
      ['Due date', 'dueDate'],
      ['Deadline', 'deadline'],
      ['Scheduled', 'scheduledDate'],
      ['Priority', 'priority'],
      ['Title', 'title'],
      ['Created', 'createdAt'],
      ['Updated', 'updatedAt'],
    ] as const;

    // FE-SF-03
    it('sends orderBy and orderDirection for every sort option and both directions', async () => {
      await startSignedIn();
      await openTaskList();
      expect(sortText()).toBe('Sort: Default order');
      // The default order has no direction to flip.
      expect(directionButton()).toBeNull();

      // The menu keeps the current direction when another field is picked.
      let direction: 'asc' | 'desc' = 'asc';
      for (const [option, field] of FIELDS) {
        await changeFilters(() => sortBy(option));
        let req = expectTaskList();
        expect(paramsOf(req)).toEqual({
          ...BASE_PARAMS,
          orderBy: field,
          orderDirection: direction,
        });
        req.flush(ALL_TASKS);
        await settle();
        expect(sortText()).toBe(`Sort: ${option}`);

        direction = direction === 'asc' ? 'desc' : 'asc';
        await changeFilters(() => press(directionButton()!));
        req = expectTaskList();
        expect(paramsOf(req)).toEqual({
          ...BASE_PARAMS,
          orderBy: field,
          orderDirection: direction,
        });
        req.flush(ALL_TASKS);
        await settle();
        expect(directionButton()?.getAttribute('aria-pressed')).toBe(String(direction === 'desc'));
        expect(urlParams()).toEqual(
          direction === 'desc' ? { orderBy: field, orderDirection: 'desc' } : { orderBy: field },
        );
      }

      // Back to the project's own order: no sort params at all.
      await changeFilters(() => sortBy('Default order'));
      const req = expectTaskList();
      expect(paramsOf(req)).toEqual(BASE_PARAMS);
      req.flush(ALL_TASKS);
      await settle();
      expect(router.url).toBe(`/projects/${CAPSTONE.id}/tasks`);
    });

    // FE-SF-03
    it('renders tasks in the order the server sends them, null dates and ties included', async () => {
      await startSignedIn();
      await openTaskList();

      await changeFilters(() => sortBy('Due date'));
      // As the server sorts by due date ascending: dated tasks first, null dates last, ties by id.
      const tie = apiTask(40, 'Also due Nov 18', LOW, { dueDate: '2026-11-18' });
      const early = apiTask(41, 'Due Nov 10', LOW, { dueDate: '2026-11-10' });
      expectTaskList().flush([early, REPORT, tie, SLIDES, NOTES]);
      await settle();

      expect(titles()).toEqual([
        'Due Nov 10',
        'Write report',
        'Also due Nov 18',
        'Make slides',
        'Read notes',
      ]);
    });
  });

  // Case 5
  describe('Debouncing', () => {
    // FE-SF-01
    it('turns rapid chip changes into one request once the input settles', async () => {
      await startSignedIn();
      await openTaskList();

      vi.useFakeTimers({ toFake: DEBOUNCE_TIMERS });
      await openChip('Priority');
      await pick('task-filter-priority', 'High');
      vi.advanceTimersByTime(DEBOUNCE_MS - 50);
      await pick('task-filter-priority', 'Medium');
      vi.advanceTimersByTime(DEBOUNCE_MS - 50);
      await pick('task-filter-priority', 'Low');
      await openChip('Labels');
      await pick('task-filter-labels', 'Planning');
      // The URL follows each click at once...
      expect(urlParams()).toEqual({ priorities: 'high,medium,low', labelIds: '21' });
      // ...but nothing is sent until the input has been still for the whole debounce.
      vi.advanceTimersByTime(DEBOUNCE_MS - 1);
      expect(pendingTaskLists()).toEqual([]);
      vi.advanceTimersByTime(1);
      vi.useRealTimers();
      await settle();

      const requests = pendingTaskLists();
      expect(requests.length).toBe(1);
      expect(paramsOf(requests[0])).toEqual({
        ...BASE_PARAMS,
        priorities: 'high,medium,low',
        labelId: '21',
      });
      requests[0].flush([REPORT]);
      await settle();
      expect(titles()).toEqual(['Write report']);
    });
  });

  // Case 6
  describe('No results', () => {
    // FE-SF-01
    it('shows the empty state with Clear filters, which brings every task back', async () => {
      await startSignedIn();
      await openTaskList();

      await changeFilters(async () => {
        await openChip('Status');
        await pick('task-filter-status', 'Completed');
      });
      const req = expectTaskList();
      expect(paramsOf(req)).toEqual({ ...BASE_PARAMS, status: 'completed' });
      req.flush([]);
      await settle();

      expect(titles()).toEqual([]);
      expect(text('.empty .empty-title')).toBe('No tasks match these filters.');
      const clear = all('.empty button').find((b) => clean(b.textContent) === 'Clear filters');

      await changeFilters(() => press(clear));
      const again = expectTaskList();
      expect(paramsOf(again)).toEqual(BASE_PARAMS);
      again.flush(ALL_TASKS);
      await settle();

      expect(router.url).toBe(`/projects/${CAPSTONE.id}/tasks`);
      expect(el('.empty')).toBeNull();
      expect(titles()).toEqual(['Write report', 'Make slides', 'Read notes']);
    });
  });

  // Case 7
  describe('Project filters and sort', () => {
    const BIOLOGY = project(12, 'Biology', {
      color: '#2563EB',
      isFavorite: true,
      sortOrder: 2,
      createdAt: '2026-10-05T00:00:00.000Z',
    });
    // Created the same day as Biology, so the two tie on the Created sort.
    const THESIS = project(13, 'Thesis', {
      color: '#16A34A',
      sortOrder: 3,
      createdAt: '2026-10-05T00:00:00.000Z',
    });
    // Older rows may come without timestamps; they sort last either way.
    const ZOOLOGY = { ...project(14, 'Zoology', { sortOrder: 4 }), createdAt: undefined };
    const OLD_NOTES = project(15, 'Old notes', {
      color: '#2563EB',
      isArchived: true,
      sortOrder: 5,
    });
    const CAPSTONE_DATED = { ...CAPSTONE, createdAt: '2026-10-01T00:00:00.000Z' };
    const ACTIVE = [INBOX, CAPSTONE_DATED, BIOLOGY, THESIS, ZOOLOGY];

    /** Answers the two lists the projects page loads, checking they carry nothing else. */
    function answerProjectLists(): void {
      const active = http.expectOne(`${PROJECTS_API}?isArchived=false`);
      const archived = http.expectOne(`${PROJECTS_API}?isArchived=true`);
      for (const req of [active, archived]) {
        expect(req.request.method).toBe('GET');
        expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
        expect(req.request.params.keys()).toEqual(['isArchived']);
      }
      active.flush(ACTIVE);
      archived.flush([OLD_NOTES]);
    }

    function projectChip(name: string): HTMLElement | undefined {
      return all('app-project-filter-bar .chip').find((c) => clean(c.textContent).startsWith(name));
    }

    // FE-SF-06
    it('keeps the grouped project list without filters', async () => {
      await startSignedIn();
      await harness.navigateByUrl('/projects');
      await settle();
      answerProjectLists();
      await settle();

      expect(router.url).toBe('/home?tab=projects');
      expect(text('#favorites-heading')).toBe('Favorites');
      expect(text('#projects-heading')).toBe('My projects');
      expect(cardNames()).toEqual(['Inbox', 'Capstone', 'Biology', 'Thesis', 'Zoology']);
      expect(sortText('app-projects-page')).toBe('Sort: Custom order');
    });

    // FE-SF-03, FE-SF-04
    it('writes favorites, color, archived and sort to the URL and filters the loaded projects', async () => {
      await startSignedIn();
      await harness.navigateByUrl('/projects');
      await settle();
      answerProjectLists();
      await settle();

      await press(projectChip('Favorites'));
      expect(urlParams()).toEqual({ tab: 'projects', favorites: 'true' });
      expect(projectChip('Favorites')?.getAttribute('aria-pressed')).toBe('true');
      expect(cardNames()).toEqual(['Capstone', 'Biology']);

      await press(projectChip('Color'));
      const blue = all('#project-filter-color .option').find(
        (o) => clean(o.textContent) === '#2563EB',
      );
      await press(blue?.querySelector('input') ?? undefined);
      expect(urlParams()).toMatchObject({ color: '#2563EB' });
      expect(router.url).toContain('color=%232563EB');

      await sortBy('Name', 'app-projects-page');
      expect(urlParams()).toEqual({
        tab: 'projects',
        favorites: 'true',
        color: '#2563EB',
        sort: 'name',
      });
      expect(cardNames()).toEqual(['Biology', 'Capstone']);
      await press(directionButton('app-projects-page')!);
      expect(urlParams()).toMatchObject({ sort: 'name', dir: 'desc' });
      expect(cardNames()).toEqual(['Capstone', 'Biology']);

      await press(projectChip('Favorites'));
      await press(projectChip('Archived'));
      expect(text('#results-heading')).toBe('Archived projects · 1');
      expect(cardNames()).toEqual(['Old notes']);

      // Filtering and sorting happen on the loaded lists: none of it reaches the server.
      expect(http.match((r) => r.url.startsWith(PROJECTS_API))).toEqual([]);
    });

    // FE-SF-03
    it('sorts by created date with missing dates last and ties in custom order', async () => {
      await startSignedIn();
      await harness.navigateByUrl('/projects');
      await settle();
      answerProjectLists();
      await settle();

      await sortBy('Created', 'app-projects-page');
      // Biology and Thesis tie and keep their custom order; Zoology has no date. With no
      // filter on, the Inbox card stays on top.
      expect(cardNames()).toEqual(['Inbox', 'Capstone', 'Biology', 'Thesis', 'Zoology']);
      await press(directionButton('app-projects-page')!);
      expect(cardNames()).toEqual(['Inbox', 'Biology', 'Thesis', 'Capstone', 'Zoology']);
      expect(urlParams()).toEqual({ tab: 'projects', sort: 'createdAt', dir: 'desc' });
    });

    // FE-SF-04
    it('restores project filters and sort from the URL on reload', async () => {
      await startSignedIn();
      await reload('/home?tab=projects&favorites=true&color=%232563EB&sort=name&dir=desc');
      answerProjectLists();
      await settle();

      expect(projectChip('Favorites')?.getAttribute('aria-pressed')).toBe('true');
      expect(clean(projectChip('Color')?.textContent)).toBe('Color: #2563EB');
      expect(text('app-project-filter-bar .count')).toBe('2 filters');
      expect(sortText('app-projects-page')).toBe('Sort: Name');
      expect(directionButton('app-projects-page')?.getAttribute('aria-pressed')).toBe('true');
      expect(cardNames()).toEqual(['Capstone', 'Biology']);

      await press(el('app-project-filter-bar button.clear'));
      expect(urlParams()).toEqual({ tab: 'projects', sort: 'name', dir: 'desc' });
      expect(cardNames()).toEqual(['Inbox', 'Zoology', 'Thesis', 'Capstone', 'Biology']);
    });
  });

  // Case 8
  describe('Failed requests', () => {
    // FE-SF-05
    it('on a 400 explains the refused filter, removes it and loads the list without it', async () => {
      await startSignedIn();
      await openTaskList();

      await changeFilters(async () => {
        await openChip('Priority');
        await pick('task-filter-priority', 'Urgent');
      });
      const rejected = expectTaskList();
      expect(paramsOf(rejected)).toEqual({ ...BASE_PARAMS, priorities: 'urgent' });

      await changeFilters(async () => {
        rejected.flush(UNKNOWN_PRIORITY, status(400, 'Bad Request'));
        await settle();
        expect(text('.filter-error')).toBe(
          "Priority filter couldn't be applied, so it was removed.",
        );
        // Not the load error: retrying the same filter would only fail again.
        expect(el('.load-error')).toBeNull();
        expect(urlParams()).toEqual({});
      });

      const retried = expectTaskList();
      expect(paramsOf(retried)).toEqual(BASE_PARAMS);
      retried.flush(ALL_TASKS);
      await settle();
      expect(chipTexts()[0]).toBe('Priority');
      expect(titles()).toEqual(['Write report', 'Make slides', 'Read notes']);
      expect(text('.filter-error')).toBe("Priority filter couldn't be applied, so it was removed.");

      // The next change dismisses the notice.
      await changeFilters(async () => {
        await openChip('Status');
        await pick('task-filter-status', 'Active');
      });
      expectTaskList().flush(ALL_TASKS);
      await settle();
      expect(el('.filter-error')).toBeNull();
    });

    // FE-SF-05
    it('on a 400 from a reloaded URL removes only the refused filter', async () => {
      await startSignedIn();
      const rejected = await openTasks(
        `/projects/${CAPSTONE.id}/tasks?priorities=urgent&status=active&orderBy=title`,
      );

      await changeFilters(async () => {
        rejected.flush(UNKNOWN_PRIORITY, status(400, 'Bad Request'));
        await settle();
      });

      const retried = expectTaskList();
      expect(paramsOf(retried)).toEqual({
        ...BASE_PARAMS,
        status: 'active',
        orderBy: 'title',
        orderDirection: 'asc',
      });
      retried.flush([NOTES]);
      await settle();
      expect(urlParams()).toEqual({ status: 'active', orderBy: 'title' });
      expect(titles()).toEqual(['Read notes']);
    });

    // FE-SF-05
    it('on a 500 keeps the filter and the last results and offers a retry', async () => {
      await startSignedIn();
      await openTaskList();

      await changeFilters(async () => {
        await openChip('Status');
        await pick('task-filter-status', 'Active');
      });
      expectTaskList().flush(SERVER_ERROR, status(500, 'Internal Server Error'));
      await settle();

      expect(text('.load-error p')).toBe(
        "Couldn't load your tasks. Something went wrong. Please try again.",
      );
      expect(urlParams()).toEqual({ status: 'active' });
      expect(titles()).toEqual(['Write report', 'Make slides', 'Read notes']);

      await press(all('.load-error button').find((b) => clean(b.textContent) === 'Try again'));
      const retry = expectTaskList();
      expect(paramsOf(retry)).toEqual({ ...BASE_PARAMS, status: 'active' });
      retry.flush([REPORT, SLIDES]);
      await settle();

      expect(el('.load-error')).toBeNull();
      expect(titles()).toEqual(['Write report', 'Make slides']);
    });

    it('on a 401 clears the session and goes to /login', async () => {
      await startSignedIn();
      await openTaskList();

      await changeFilters(async () => {
        await openChip('Repeat');
        await pick('task-filter-repeat', 'Repeating');
      });
      expectTaskList().flush(TOKEN_REJECTED, status(401, 'Unauthorized'));
      await settle();

      expect(router.url).toBe('/login');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });
});
