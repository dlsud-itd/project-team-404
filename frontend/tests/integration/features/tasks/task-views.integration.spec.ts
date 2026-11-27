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
import { taskViewStorageKey } from '../../../../src/app/features/tasks/task-views/task-views.store';
import { environment } from '../../../../src/environments/environment';

/**
 * List & Table Views frontend integration tests (Sprint 6: FE-LTV-01 to FE-LTV-05).
 *
 * The app runs through its real /projects/:projectId/tasks route behind authGuard: the task list
 * page with its view switcher (links that set ?view=), TaskViewsStore (the per-project view saved
 * in localStorage), the List and Table views, the Sprint 5 filter bar and sort menu,
 * TaskQueryStore with its real 250 ms debounce, TaskService, TasksStore and authInterceptor. The
 * Home task list is used to compare the Table's checkbox with the list's. providePriorityLevels()
 * and provideUserSettings() are registered as in app.config.ts.
 *
 * Only the network is faked, with the backend's bodies: toTaskModel for GET /api/tasks, the
 * update controller's `{ id, isDone, doneAt, position }` for PUT /api/tasks/:id, toProjectModel,
 * toLabelModel, toPriorityModel, require-auth's 401 and the error handler's 500. The debounce is
 * driven with Vitest's fake setInterval and Date, which rxjs's debounceTime uses, so the router
 * and Angular keep their real timers. http.verify() runs after every test.
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
const DEBOUNCE_TIMERS: ('setInterval' | 'clearInterval' | 'Date')[] = [
  'setInterval',
  'clearInterval',
  'Date',
];
/** The moment a checkbox is ticked, so both views' doneAt can be compared. */
const NOW = '2026-11-19T04:00:00.000Z';

const USER = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 1,
};

const STAMPS = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' };

const SETTINGS = {
  userId: USER.id,
  dashboardTaskLimit: 5,
  dashboardProjectLimit: 5,
  fontSize: 'medium',
  fontFamily: 'system',
  ...STAMPS,
};

type ApiPriority = { id: number; name: string; color: string; sortOrder: number };

/** A priority level as toPriorityModel sends it. */
function level(id: number, name: string, color: string, sortOrder: number) {
  return { id, name, color, sortOrder, isDefault: name === 'Medium', taskCount: 0, ...STAMPS };
}

const HIGH = level(1, 'High', '#D84A4A', 0);
const MEDIUM = level(2, 'Medium', '#D59B38', 1);
const LOW = level(3, 'Low', '#6E9F79', 2);
const LEVELS = [HIGH, MEDIUM, LOW];

const PLANNING = {
  id: 21,
  name: 'Planning',
  color: '#2563EB',
  sortOrder: 0,
  isArchived: false,
  archivedAt: null,
  ...STAMPS,
};

/** A project as toProjectModel sends it. */
const CAPSTONE = {
  id: 10,
  name: 'Capstone',
  description: null,
  color: '#2563EB',
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 1,
  ...STAMPS,
};
const THESIS = { ...CAPSTONE, id: 11, name: 'Thesis', sortOrder: 2 };

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
    position: id,
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

// In position order, as GET /api/tasks?orderBy=position sends them: open tasks, then done ones.
const REPORT = apiTask(31, 'Write report', HIGH, {
  dueDate: '2030-01-15',
  labels: [{ id: PLANNING.id, name: PLANNING.name, color: PLANNING.color }],
});
const SLIDES = apiTask(32, 'Make slides', LOW, { dueDate: '2030-01-10' });
const NOTES = apiTask(33, 'Read notes', MEDIUM);
const PROPOSAL = apiTask(34, 'Send proposal', MEDIUM, { isDone: true, doneAt: NOW });
const TASKS = [REPORT, SLIDES, NOTES, PROPOSAL];
const TITLES = ['Write report', 'Make slides', 'Read notes', 'Send proposal'];

/** What TaskService sends for the project with no filter or sort: the project's own order. */
const BASE_PARAMS = {
  projectId: `${CAPSTONE.id}`,
  status: 'all',
  pageSize: '100',
  orderBy: 'position',
  orderDirection: 'asc',
};

// Error bodies from require-auth.middleware.ts and error-handler.middleware.ts.
const TOKEN_REJECTED = { error: 'Token invalid or expired' };
const SERVER_ERROR = { error: 'Internal server error' };
const status = (code: number, statusText = 'Error') => ({ status: code, statusText });

describe('Task views integration (List & Table views + API)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.fixture.nativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const clean = (value: string | null | undefined) => value?.trim().replace(/\s+/g, ' ') ?? '';
  const text = (selector: string) => clean(el(selector)?.textContent);

  const listTitles = () =>
    all('app-list-view app-task-item .title').map((t) => clean(t.textContent));
  const tableTitles = () => all('app-table-view tbody tr a.title').map((t) => clean(t.textContent));
  /** One table column's cells, top to bottom. */
  const column = (key: string) =>
    all(`app-table-view tbody tr .col-${key}`).map((cell) => clean(cell.textContent));
  const header = (key: string) => el(`app-table-view thead th.col-${key}`);
  const headerButton = (key: string) => el<HTMLButtonElement>(`app-table-view th.col-${key} .sort`);
  const viewLink = (label: string) =>
    all('app-view-switcher a').find((a) => clean(a.textContent) === label) as HTMLAnchorElement;
  const currentView = () => clean(el('app-view-switcher a[aria-current="page"]')?.textContent);

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function press(target: HTMLElement | undefined): Promise<void> {
    expect(target, 'element to press').toBeTruthy();
    target!.click();
    await settle();
  }

  function urlParams(): Record<string, string> {
    return router.parseUrl(router.url).queryParams as Record<string, string>;
  }

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

  /** Like pressing F5: a fresh app on `url`, signed in again from the stored token. */
  async function reload(url: string): Promise<void> {
    // Opening a project stamps it for the dashboard's "Recently accessed" sort.
    http.match((r) => r.url.endsWith('/access'));
    http.verify();
    TestBed.resetTestingModule();
    configure();
    await startSignedIn();
    await harness.navigateByUrl(url);
    await settle();
  }

  /** The one pending GET /api/tasks for `projectId`, carrying the session token. */
  function expectTaskList(projectId = CAPSTONE.id): TestRequest {
    const req = http.expectOne(
      (r) =>
        r.method === 'GET' && r.url === TASKS_API && r.params.get('projectId') === `${projectId}`,
    );
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    return req;
  }

  /** Answers the labels and project requests the page sends when it opens a project. */
  function answerProject(project = CAPSTONE): void {
    http.match(LABELS_API).forEach((req) => req.flush([PLANNING]));
    http.expectOne(`${PROJECTS_API}/${project.id}`).flush(project);
  }

  /** Opens a task-page URL and returns its GET /api/tasks, not yet answered. */
  async function openTasks(query = ''): Promise<TestRequest> {
    await harness.navigateByUrl(`/projects/${CAPSTONE.id}/tasks${query}`);
    await settle();
    answerProject();
    return expectTaskList();
  }

  /** Opens a task-page URL, shows `tasks` and returns the request that loaded them. */
  async function openWith(query = '', tasks: ApiTask[] = TASKS): Promise<TestRequest> {
    const req = await openTasks(query);
    req.flush(tasks);
    await settle();
    return req;
  }

  /** Reloads `url` and returns its GET /api/tasks, not yet answered. */
  async function reloadTasks(url: string): Promise<TestRequest> {
    await reload(url);
    answerProject();
    return expectTaskList();
  }

  /** Runs `steps` as quick user input, then lets TaskQueryStore's debounce elapse. */
  async function afterDebounce(steps: () => Promise<void>): Promise<void> {
    vi.useFakeTimers({ toFake: DEBOUNCE_TIMERS });
    try {
      await steps();
      vi.advanceTimersByTime(DEBOUNCE_MS);
    } finally {
      vi.useRealTimers();
    }
    await settle();
  }

  /** Clicks a table header and returns the GET /api/tasks it causes, not yet answered. */
  async function clickHeader(key: string): Promise<TestRequest> {
    await afterDebounce(() => press(headerButton(key)));
    return expectTaskList();
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    configure();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    try {
      // Opening a project stamps it for the dashboard's "Recently accessed" sort.
      http?.match((r) => r.url.endsWith('/access'));
      if (http) http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  // Case 1 — FE-LTV-01, FE-LTV-02
  describe('Switching views', () => {
    it('opens on the List in position order, with open tasks before completed ones', async () => {
      await startSignedIn();
      const req = await openWith();

      expect(paramsOf(req)).toEqual(BASE_PARAMS);
      expect(currentView()).toBe('List');
      expect(el('app-table-view')).toBeNull();
      expect(listTitles()).toEqual(TITLES);
      expect(
        all('[aria-labelledby="open-heading"] app-task-item .title').map((t) =>
          clean(t.textContent),
        ),
      ).toEqual(['Write report', 'Make slides', 'Read notes']);
      expect(
        all('[aria-labelledby="completed-heading"] app-task-item .title').map((t) =>
          clean(t.textContent),
        ),
      ).toEqual(['Send proposal']);
    });

    it('switches to Table with ?view=table and the same tasks, without asking the server again', async () => {
      await startSignedIn();
      await openWith();

      await press(viewLink('Table'));

      expect(urlParams()).toEqual({ view: 'table' });
      expect(currentView()).toBe('Table');
      expect(el('app-list-view')).toBeNull();
      // The same tasks, in the order the server sent them.
      expect(tableTitles()).toEqual(TITLES);
      // List and table share one load, so no new GET /api/tasks (http.verify() checks it).
      http.expectNone((r) => r.method === 'GET' && r.url === TASKS_API);

      await press(viewLink('List'));
      expect(urlParams()).toEqual({ view: 'list' });
      expect(listTitles()).toEqual(TITLES);
      http.expectNone((r) => r.method === 'GET' && r.url === TASKS_API);
    });

    it('shows title, project, priority, labels, due date and status in the table', async () => {
      await startSignedIn();
      await openWith('?view=table');

      expect(all('app-table-view thead th').map((th) => clean(th.textContent))).toEqual([
        'Title',
        'Project',
        'Priority',
        'Labels',
        'Scheduled',
        'Due',
        'Deadline',
        'Recurrence',
        'Streak',
        'Status',
      ]);
      expect(column('title')).toEqual(TITLES);
      expect(column('project')).toEqual(['Capstone', 'Capstone', 'Capstone', 'Capstone']);
      expect(column('priority')).toEqual(['High', 'Low', 'Medium', 'Medium']);
      expect(column('labels')).toEqual(['Planning', '—', '—', '—']);
      expect(column('due')).toEqual(['Jan 15, 2030', 'Jan 10, 2030', '—', '—']);
      expect(column('status')).toEqual(['To do', 'To do', 'To do', 'Done']);
    });
  });

  // Case 2 — FE-LTV-01
  describe('Keeping the view', () => {
    it('opens the table again when the page is reloaded with ?view=table', async () => {
      await startSignedIn();
      await openWith();
      await press(viewLink('Table'));

      const req = await reloadTasks(`/projects/${CAPSTONE.id}/tasks?view=table`);
      expect(paramsOf(req)).toEqual(BASE_PARAMS);
      req.flush(TASKS);
      await settle();

      expect(currentView()).toBe('Table');
      expect(tableTitles()).toEqual(TITLES);
    });

    it('opens a project on the view last used there when the URL names none, and other projects on their own', async () => {
      await startSignedIn();
      await openWith('?view=table');
      expect(localStorage.getItem(taskViewStorageKey(CAPSTONE.id))).toBe('table');

      const req = await reloadTasks(`/projects/${CAPSTONE.id}/tasks`);
      req.flush(TASKS);
      await settle();
      expect(currentView()).toBe('Table');
      expect(el('app-table-view')).not.toBeNull();
      expect(urlParams()).toEqual({});

      // Thesis was never switched, so it opens on the list.
      await harness.navigateByUrl(`/projects/${THESIS.id}/tasks`);
      await settle();
      answerProject(THESIS);
      expectTaskList(THESIS.id).flush([apiTask(41, 'Outline', MEDIUM, { projectId: THESIS.id })]);
      await settle();
      expect(currentView()).toBe('List');
      expect(listTitles()).toEqual(['Outline']);

      // An explicit ?view=list wins over the saved table, and is saved in turn.
      await reload(`/projects/${CAPSTONE.id}/tasks?view=list`);
      answerProject();
      expectTaskList().flush(TASKS);
      await settle();
      expect(currentView()).toBe('List');
      expect(localStorage.getItem(taskViewStorageKey(CAPSTONE.id))).toBe('list');
    });

    it('opens on the list when the saved view is unknown', async () => {
      localStorage.setItem(taskViewStorageKey(CAPSTONE.id), 'sideways');
      await startSignedIn();
      await openWith();

      expect(currentView()).toBe('List');
      expect(listTitles()).toEqual(TITLES);
    });

    it('does not crash when localStorage throws, and still switches views', async () => {
      // Blocked site data: the views' keys throw; the session token still reads.
      const getItem = Storage.prototype.getItem;
      const setItem = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
        if (key.startsWith('habittracker.taskView.'))
          throw new DOMException('Blocked', 'SecurityError');
        return getItem.call(this, key);
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
        this: Storage,
        key,
        value,
      ) {
        if (key.startsWith('habittracker.taskView.'))
          throw new DOMException('Full', 'QuotaExceededError');
        return setItem.call(this, key, value);
      });

      await startSignedIn();
      await openWith();
      expect(currentView()).toBe('List');
      expect(listTitles()).toEqual(TITLES);

      await press(viewLink('Table'));
      expect(currentView()).toBe('Table');
      expect(tableTitles()).toEqual(TITLES);
    });
  });

  // Case 3 — FE-LTV-04
  describe('Filters and sort across views', () => {
    it('keeps the filter bar and sort when switching between List and Table', async () => {
      await startSignedIn();
      const req = await openTasks('?priorities=high,low&orderBy=dueDate');
      expect(paramsOf(req)).toEqual({
        ...BASE_PARAMS,
        priorities: 'high,low',
        orderBy: 'dueDate',
      });
      req.flush([SLIDES, REPORT]);
      await settle();
      expect(listTitles()).toEqual(['Make slides', 'Write report']);
      const chips = () =>
        all('app-task-filter-bar .chip .chip-text').map((c) => clean(c.textContent));
      expect(chips()).toContain('Priority: High, Low');

      await press(viewLink('Table'));

      // The URL keeps the filter and sort; the table shows the same filtered rows.
      expect(urlParams()).toEqual({ priorities: 'high,low', orderBy: 'dueDate', view: 'table' });
      expect(tableTitles()).toEqual(['Make slides', 'Write report']);
      expect(chips()).toContain('Priority: High, Low');
      expect(text('app-task-list app-sort-menu .trigger')).toContain('Due date');
      expect(header('due').getAttribute('aria-sort')).toBe('ascending');

      await press(viewLink('List'));
      expect(urlParams()).toEqual({ priorities: 'high,low', orderBy: 'dueDate', view: 'list' });
      expect(listTitles()).toEqual(['Make slides', 'Write report']);
      expect(chips()).toContain('Priority: High, Low');
      http.expectNone((r) => r.method === 'GET' && r.url === TASKS_API);
    });

    it('keeps the filter and the table after a reload', async () => {
      await startSignedIn();
      await openWith('?view=table&priorities=high', [REPORT]);

      const req = await reloadTasks(`/projects/${CAPSTONE.id}/tasks?view=table&priorities=high`);
      // One level goes in the Sprint 3 `priority` param.
      expect(paramsOf(req)).toEqual({ ...BASE_PARAMS, priority: 'high' });
      req.flush([REPORT]);
      await settle();

      expect(currentView()).toBe('Table');
      expect(tableTitles()).toEqual(['Write report']);
    });
  });

  // Case 4 — FE-LTV-03
  describe('Sorting from the table headers', () => {
    it('sends orderBy and orderDirection for Title, Priority and Due, toggling asc and desc', async () => {
      await startSignedIn();
      await openWith('?view=table');

      // Only fields GET /api/tasks can order by are sortable.
      expect(header('project').querySelector('button')).toBeNull();
      expect(header('labels').querySelector('button')).toBeNull();
      expect(header('status').querySelector('button')).toBeNull();
      expect(header('title').getAttribute('aria-sort')).toBe('none');
      expect(headerButton('title').getAttribute('aria-label')).toBe('Sort by Title, ascending');

      const cases: [string, string, ApiTask[], string[]][] = [
        [
          'title',
          'title',
          [SLIDES, NOTES, PROPOSAL, REPORT],
          ['Make slides', 'Read notes', 'Send proposal', 'Write report'],
        ],
        [
          'priority',
          'priority',
          [REPORT, NOTES, PROPOSAL, SLIDES],
          ['Write report', 'Read notes', 'Send proposal', 'Make slides'],
        ],
        [
          'due',
          'dueDate',
          [SLIDES, REPORT, NOTES, PROPOSAL],
          ['Make slides', 'Write report', 'Read notes', 'Send proposal'],
        ],
      ];
      for (const [key, orderBy, ascending, ascendingTitles] of cases) {
        const asc = await clickHeader(key);
        expect(paramsOf(asc)).toEqual({ ...BASE_PARAMS, orderBy, orderDirection: 'asc' });
        asc.flush(ascending);
        await settle();
        expect(tableTitles()).toEqual(ascendingTitles);
        expect(header(key).getAttribute('aria-sort')).toBe('ascending');
        expect(urlParams()).toEqual({ view: 'table', orderBy });

        const desc = await clickHeader(key);
        expect(paramsOf(desc)).toEqual({ ...BASE_PARAMS, orderBy, orderDirection: 'desc' });
        const descending = [...ascending].reverse();
        desc.flush(descending);
        await settle();
        // The table shows the server's order, not its own.
        expect(tableTitles()).toEqual([...ascendingTitles].reverse());
        expect(header(key).getAttribute('aria-sort')).toBe('descending');
        expect(urlParams()).toEqual({ view: 'table', orderBy, orderDirection: 'desc' });
        // The sort menu shows the same sort.
        expect(text('app-task-list app-sort-menu .trigger')).toContain(
          { title: 'Title', priority: 'Priority', dueDate: 'Due date' }[orderBy]!,
        );
      }

      // Only one header is sorted at a time.
      expect(header('title').getAttribute('aria-sort')).toBe('none');
      expect(header('priority').getAttribute('aria-sort')).toBe('none');
    });

    it('goes back to the project order on a third click', async () => {
      await startSignedIn();
      await openWith('?view=table&orderBy=title&orderDirection=desc');

      expect(header('title').getAttribute('aria-sort')).toBe('descending');
      expect(headerButton('title').getAttribute('aria-label')).toBe(
        'Sort by Title: back to default order',
      );

      const req = await clickHeader('title');
      expect(paramsOf(req)).toEqual(BASE_PARAMS);
      req.flush(TASKS);
      await settle();

      expect(header('title').getAttribute('aria-sort')).toBe('none');
      expect(urlParams()).toEqual({ view: 'table' });
      expect(tableTitles()).toEqual(TITLES);
    });
  });

  // Case 5
  describe('Completing a task from the table', () => {
    async function tick(checkbox: HTMLInputElement): Promise<void> {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(NOW));
      try {
        checkbox.click();
      } finally {
        vi.useRealTimers();
      }
      await settle();
    }

    it('sends the same PUT as the list checkbox and shows the task as done', async () => {
      await startSignedIn();
      await openWith('?view=table');

      const box = el<HTMLInputElement>(
        'app-table-view input[aria-label="Mark Read notes complete"]',
      );
      await tick(box);
      const tablePut = http.expectOne({ method: 'PUT', url: `${TASKS_API}/${NOTES.id}` });
      expect(tablePut.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
      expect(tablePut.request.body).toEqual({ isDone: true, doneAt: NOW });
      tablePut.flush({ id: NOTES.id, isDone: true, doneAt: NOW, position: NOTES.position });
      await settle();

      expect(column('status')).toEqual(['To do', 'To do', 'Done', 'Done']);
      expect(
        el<HTMLInputElement>('app-table-view input[aria-label="Mark Read notes incomplete"]')
          .checked,
      ).toBe(true);
      expect(el('app-table-view .error')).toBeNull();

      // The Home task list's checkbox, for the same kind of task.
      await harness.navigateByUrl('/home');
      await settle();
      http
        .match((r) => r.url === PROJECTS_API)
        .forEach((r) => r.flush(r.request.params.get('isArchived') === 'true' ? [] : [CAPSTONE]));
      http
        .match((r) => r.method === 'GET' && r.url === TASKS_API)
        .forEach((r) => r.flush([SLIDES]));
      await settle();

      const homeRow = all('app-all-tasks .task').find((row) =>
        row.textContent?.includes('Make slides'),
      );
      const homeBox = homeRow!.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
      await tick(homeBox);
      const listPut = http.expectOne({ method: 'PUT', url: `${TASKS_API}/${SLIDES.id}` });
      expect(listPut.request.body).toEqual(tablePut.request.body);
      listPut.flush({ id: SLIDES.id, isDone: true, doneAt: NOW, position: SLIDES.position });
      await settle();
    });

    it('reopens a done task with isDone false', async () => {
      await startSignedIn();
      await openWith('?view=table');

      await tick(
        el<HTMLInputElement>('app-table-view input[aria-label="Mark Send proposal incomplete"]'),
      );
      const put = http.expectOne({ method: 'PUT', url: `${TASKS_API}/${PROPOSAL.id}` });
      expect(put.request.body).toEqual({ isDone: false, doneAt: null });
      put.flush({ id: PROPOSAL.id, isDone: false, doneAt: null, position: PROPOSAL.position });
      await settle();

      expect(column('status')).toEqual(['To do', 'To do', 'To do', 'To do']);
    });

    it('unticks the box and shows the error when the save fails', async () => {
      await startSignedIn();
      await openWith('?view=table');

      const box = el<HTMLInputElement>(
        'app-table-view input[aria-label="Mark Read notes complete"]',
      );
      await tick(box);
      http
        .expectOne({ method: 'PUT', url: `${TASKS_API}/${NOTES.id}` })
        .flush(SERVER_ERROR, status(500));
      await settle();

      expect(box.checked).toBe(false);
      expect(column('status')).toEqual(['To do', 'To do', 'To do', 'Done']);
      expect(text('app-table-view .error')).toBe('Something went wrong. Please try again.');
      expect(el('app-table-view .error').getAttribute('role')).toBe('alert');
    });
  });

  // Case 6 — FE-LTV-05
  describe('Loading, empty and failed states in the table', () => {
    it('shows a loading message until the tasks arrive', async () => {
      await startSignedIn();
      const req = await openTasks('?view=table');

      expect(text('app-task-list p.status')).toBe('Loading tasks…');
      expect(el('app-task-list p.status').getAttribute('role')).toBe('status');
      expect(el('app-table-view')).toBeNull();

      req.flush(TASKS);
      await settle();
      expect(el('app-task-list p.status')).toBeNull();
      expect(tableTitles()).toEqual(TITLES);
    });

    it('shows the empty state for []', async () => {
      await startSignedIn();
      await openWith('?view=table', []);

      expect(el('app-table-view')).toBeNull();
      expect(text('.empty .empty-title')).toBe('No tasks here yet.');
    });

    it('shows the filter empty state for [] while a filter is applied', async () => {
      await startSignedIn();
      await openWith('?view=table&priorities=high', []);

      expect(el('app-table-view')).toBeNull();
      expect(text('.empty .empty-title')).toBe('No tasks match these filters.');
    });

    it('shows an error with Try again on a 500, keeps the loaded rows and loads again on retry', async () => {
      await startSignedIn();
      await openWith('?view=table');

      // A sort that fails: the rows already shown stay.
      const failed = await clickHeader('title');
      failed.flush(SERVER_ERROR, status(500));
      await settle();

      expect(text('.load-error p')).toBe(
        "Couldn't load your tasks. Something went wrong. Please try again.",
      );
      expect(el('.load-error').getAttribute('role')).toBe('alert');
      expect(tableTitles()).toEqual(TITLES);

      await press(el('.load-error .retry'));
      // While it retries the rows stay.
      expect(tableTitles()).toEqual(TITLES);
      const retry = expectTaskList();
      expect(paramsOf(retry)).toEqual({ ...BASE_PARAMS, orderBy: 'title' });
      retry.flush([SLIDES, NOTES, PROPOSAL, REPORT]);
      await settle();

      expect(el('.load-error')).toBeNull();
      expect(tableTitles()).toEqual(['Make slides', 'Read notes', 'Send proposal', 'Write report']);
    });

    it('shows the error with Try again when the first load fails', async () => {
      await startSignedIn();
      (await openTasks('?view=table')).flush(SERVER_ERROR, status(500));
      await settle();

      expect(text('.load-error p')).toContain("Couldn't load your tasks.");

      await press(el('.load-error .retry'));
      expectTaskList().flush(TASKS);
      await settle();
      expect(el('.load-error')).toBeNull();
      expect(tableTitles()).toEqual(TITLES);
    });

    it('clears the session and opens /login on a 401', async () => {
      await startSignedIn();
      (await openTasks('?view=table')).flush(TOKEN_REJECTED, status(401, 'Unauthorized'));
      await settle();

      expect(router.url).toBe('/login');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });
});
