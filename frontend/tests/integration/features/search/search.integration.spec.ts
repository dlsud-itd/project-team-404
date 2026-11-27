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
import { SEARCH_DEBOUNCE_MS } from '../../../../src/app/features/search/services/search.service';
import type {
  ApiSearchProject,
  ApiSearchTask,
} from '../../../../src/app/features/search/types/search.types';
import type { ApiTask } from '../../../../src/app/features/tasks/shared/types/task.types';
import { environment } from '../../../../src/environments/environment';

/**
 * Search frontend integration tests (Sprint 5: FE-SRCH rows).
 *
 * The app runs through its real app shell behind authGuard, with the real top-bar search box,
 * search results and /search page, SearchService, ProjectService, the stores and
 * authInterceptor. Only the network and the debounce timers are faked. GET /api/search answers
 * with the shape backend/src/features/search builds ({ tasks, projects } groups of
 * toSearchTaskResult / toSearchProjectResult items with totals); errors use require-auth's 401
 * and the error handler's 500. The debounce runs on Vitest's fake setInterval and Date, which
 * rxjs's timer uses, so Angular and the router keep their real timers.
 */

const API = `${environment.apiBaseUrl}/api`;
const AUTH_API = `${API}/auth`;
const TASKS_API = `${API}/tasks`;
const PROJECTS_API = `${API}/projects`;
const LABELS_API = `${API}/labels`;
const SEARCH_API = `${API}/search`;
const TOKEN = 'session-token';
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

function apiProject(id: number, name: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name,
    description: null,
    color: '#2563EB',
    isInbox: false,
    isFavorite: false,
    isArchived: false,
    archivedAt: null,
    sortOrder: id,
    ...STAMPS,
    ...overrides,
  };
}

const INBOX = apiProject(1, 'Inbox', { color: null, isInbox: true, sortOrder: 0 });
const CAPSTONE = apiProject(10, 'Capstone');
const WRITING_CLUB = apiProject(40, 'Writing club', { color: '#16A34A' });

/** A task as toTaskModel sends it. */
function apiTask(id: number, title: string, overrides: Partial<ApiTask> = {}): ApiTask {
  return {
    id,
    projectId: CAPSTONE.id,
    position: id,
    title,
    description: null,
    priority: 'high',
    scheduledDate: null,
    dueDate: '2026-11-25',
    deadline: null,
    recurrence: null,
    recurrenceDays: [],
    recurrenceEndDate: null,
    isDone: false,
    doneAt: null,
    isArchived: false,
    archivedAt: null,
    ...STAMPS,
    labels: [],
    ...overrides,
  } as ApiTask;
}

const REPORT = apiTask(31, 'Write report');
const SLIDES = apiTask(32, 'Make slides', {
  description: 'First write the <script>alert(1)</script> outline',
});

/** One task item of GET /api/search (toSearchTaskResult). */
function taskHit(task: ApiTask, overrides: Partial<ApiSearchTask> = {}): ApiSearchTask {
  return {
    id: task.id,
    title: task.title,
    projectId: task.projectId,
    matchedField: 'title',
    snippet: task.title,
    isArchived: false,
    archivedAt: null,
    ...overrides,
  };
}

/** One project item of GET /api/search (toSearchProjectResult). */
function projectHit(
  project: ReturnType<typeof apiProject>,
  overrides: Partial<ApiSearchProject> = {},
): ApiSearchProject {
  return {
    id: project.id,
    name: project.name,
    matchedField: 'name',
    snippet: project.name,
    isArchived: false,
    archivedAt: null,
    ...overrides,
  };
}

function searchBody(
  tasks: ApiSearchTask[] = [],
  projects: ApiSearchProject[] = [],
  totals: { tasks?: number; projects?: number } = {},
) {
  return {
    tasks: { items: tasks, total: totals.tasks ?? tasks.length },
    projects: { items: projects, total: totals.projects ?? projects.length },
  };
}

const REPORT_HIT = taskHit(REPORT);
// The snippet is plain text from the database; it must never be parsed as HTML.
const SLIDES_HIT = taskHit(SLIDES, {
  matchedField: 'description',
  snippet: 'First write the <script>alert(1)</script> outline',
});
const CLUB_HIT = projectHit(WRITING_CLUB);
const WRIT_RESULTS = searchBody([REPORT_HIT, SLIDES_HIT], [CLUB_HIT]);

const TOKEN_REJECTED = { error: 'Token invalid or expired' };
const SERVER_ERROR = { error: 'Internal server error' };

const status = (code: number, statusText = 'Error') => ({ status: code, statusText });

describe('Search integration (top-bar search box, /search page + API)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.fixture.nativeElement as HTMLElement;
  const clean = (value: string | null | undefined) => value?.trim().replace(/\s+/g, ' ') ?? '';
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const text = (selector: string) => clean(el(selector)?.textContent);
  const box = () => el<HTMLInputElement>('app-search-box input[role="combobox"]');
  const options = () => all('app-search-box [role="option"]');
  const optionTitles = () => options().map((o) => clean(o.querySelector('.title')?.textContent));

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function press(target: HTMLElement | null | undefined): Promise<void> {
    expect(target, 'element to press').toBeTruthy();
    target!.click();
    await settle();
  }

  function expectAuthorized(req: TestRequest): TestRequest {
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    return req;
  }

  /** The pending GET /api/search, checked against the params the UI should send. */
  function expectSearch(params: Record<string, string>): TestRequest {
    const req = http.expectOne((r) => r.url === SEARCH_API);
    const sent = Object.fromEntries(
      req.request.params.keys().map((key) => [key, req.request.params.get(key)]),
    );
    expect(sent).toEqual(params);
    return expectAuthorized(req);
  }

  const dropdownParams = (q: string, includeArchived = false) => ({
    q,
    type: 'all',
    limit: '5',
    includeArchived: String(includeArchived),
  });

  function searches(): TestRequest[] {
    return http.match((r) => r.url === SEARCH_API);
  }

  /** Answers GET /api/projects, which SearchService asks for once to name projects. */
  function answerProjects(): void {
    http
      .match((r) => r.method === 'GET' && r.url === PROJECTS_API)
      .forEach((req) =>
        req.flush(
          req.request.params.get('isArchived') === 'true' ? [] : [INBOX, CAPSTONE, WRITING_CLUB],
        ),
      );
  }

  /** Signs in the way a page load does: a stored token that GET /api/auth/me accepts. */
  async function startSignedIn(): Promise<void> {
    localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    http.expectOne(`${AUTH_API}/me`).flush(USER);
    await settle();
  }

  /** Opens Capstone's task list, a page with the top bar, and answers its requests. */
  async function openTaskList(): Promise<void> {
    await harness.navigateByUrl(`/projects/${CAPSTONE.id}/tasks`);
    await settle();
    http.expectOne(LABELS_API).flush([]);
    http.expectOne(`${PROJECTS_API}/${CAPSTONE.id}`).flush(CAPSTONE);
    http
      .expectOne((r) => r.url === TASKS_API && r.params.get('projectId') === `${CAPSTONE.id}`)
      .flush([REPORT, SLIDES]);
    await settle();
    expect(box()).toBeTruthy();
  }

  function typeInto(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
  }

  function key(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    harness.detectChanges();
    return event;
  }

  /** Types into the search box with the debounce on fake timers, then lets `elapsed` pass. */
  async function typeQuery(value: string, elapsed = SEARCH_DEBOUNCE_MS): Promise<void> {
    vi.useFakeTimers({ toFake: DEBOUNCE_TIMERS });
    try {
      box().focus();
      typeInto(box(), value);
      vi.advanceTimersByTime(elapsed);
    } finally {
      vi.useRealTimers();
    }
    await settle();
  }

  /** Runs an action whose search is sent without waiting for typing (toggle, retry). */
  async function immediately(action: () => void | Promise<void>): Promise<void> {
    vi.useFakeTimers({ toFake: DEBOUNCE_TIMERS });
    try {
      await action();
      vi.advanceTimersByTime(0);
    } finally {
      vi.useRealTimers();
    }
    await settle();
  }

  /** Searches "writ" from the box and shows the standard results. */
  async function searchWrit(): Promise<void> {
    await typeQuery('writ');
    expectSearch(dropdownParams('writ')).flush(WRIT_RESULTS);
    answerProjects();
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
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    try {
      // Opening a project stamps it for the dashboard's "Recently accessed" sort.
      http?.match((r) => r.url.endsWith('/access'));
      if (http) http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  // Case 1
  describe('Keyboard shortcuts', () => {
    // FE-SRCH-01
    it('Ctrl+K, Cmd+K and / focus the search box; / typed in a field stays a slash', async () => {
      await startSignedIn();
      await openTaskList();
      expect(box().getAttribute('aria-keyshortcuts')).toBe('Control+K Meta+K /');

      const ctrlK = key(document.body, { key: 'k', ctrlKey: true });
      expect(document.activeElement).toBe(box());
      expect(ctrlK.defaultPrevented).toBe(true);

      box().blur();
      key(document.body, { key: 'K', metaKey: true });
      expect(document.activeElement).toBe(box());

      box().blur();
      const slash = key(document.body, { key: '/' });
      expect(document.activeElement).toBe(box());
      expect(slash.defaultPrevented).toBe(true);

      // In another text field, / is just a character.
      box().blur();
      const other = document.createElement('input');
      page().appendChild(other);
      other.focus();
      const typed = key(other, { key: '/' });
      expect(typed.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(other);
      other.remove();
    });
  });

  // Case 2
  describe('Debouncing', () => {
    // FE-SRCH-01, FE-SRCH-04
    it('sends nothing for one character and one request once typing pauses', async () => {
      await startSignedIn();
      await openTaskList();

      await typeQuery('w', SEARCH_DEBOUNCE_MS * 2);
      expect(searches()).toEqual([]);
      expect(el('app-search-box .panel')).toBeNull();

      vi.useFakeTimers({ toFake: DEBOUNCE_TIMERS });
      typeInto(box(), 'wr');
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50);
      typeInto(box(), 'wri');
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50);
      typeInto(box(), 'writ');
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
      expect(searches()).toEqual([]);
      vi.advanceTimersByTime(1);
      vi.useRealTimers();
      await settle();

      expectSearch(dropdownParams('writ')).flush(WRIT_RESULTS);
      answerProjects();
      await settle();
      expect(optionTitles()).toEqual(['Write report', 'Make slides', 'Writing club']);
    });

    // FE-SRCH-01
    it('cancels an older query when a newer one is sent, and shows only the newer answer', async () => {
      await startSignedIn();
      await openTaskList();

      await typeQuery('writ');
      const older = expectSearch(dropdownParams('writ'));
      answerProjects();
      expect(text('app-search-box .state')).toBe('Searching…');

      await typeQuery('club');
      expect(older.cancelled).toBe(true);
      expectSearch(dropdownParams('club')).flush(searchBody([], [CLUB_HIT]));
      await settle();

      expect(optionTitles()).toEqual(['Writing club']);
    });
  });

  // Case 3
  describe('Results', () => {
    // FE-SRCH-02
    it('groups tasks and projects with highlights and an "in description" tag', async () => {
      await startSignedIn();
      await openTaskList();
      await searchWrit();

      expect(box().getAttribute('aria-expanded')).toBe('true');
      const headings = all('app-search-box .group-heading').map((h) => clean(h.textContent));
      expect(headings).toEqual(['Tasks 2', 'Projects 1']);
      expect(optionTitles()).toEqual(['Write report', 'Make slides', 'Writing club']);

      const [report, slides, club] = options();
      // Matches are case-insensitive and wrapped in <mark>.
      expect([...report.querySelectorAll('.title mark')].map((m) => m.textContent)).toEqual([
        'Writ',
      ]);
      expect([...club.querySelectorAll('.title mark')].map((m) => m.textContent)).toEqual(['Writ']);
      // Project names and task details come from the app's stores.
      expect(clean(report.querySelector('.project')?.textContent)).toBe('Capstone');
      expect(clean(report.querySelector('.due')?.textContent)).toBe('Due Nov 25');
      expect(report.querySelector('.tag')).toBeNull();

      // A description match says so and shows the text around the match.
      expect(clean(slides.querySelector('.tag')?.textContent)).toBe('in description');
      expect([...slides.querySelectorAll('.snippet mark')].map((m) => m.textContent)).toEqual([
        'writ',
      ]);
      expect(text('app-search-box [aria-live="polite"]')).toBe('2 tasks and 1 project found');
    });

    // FE-SRCH-02
    it('shows highlighted text containing <script> as text, never as markup', async () => {
      await startSignedIn();
      await openTaskList();
      await searchWrit();

      const snippet = options()[1].querySelector('.snippet')!;
      expect(clean(snippet.textContent)).toBe('First write the <script>alert(1)</script> outline');
      expect(page().querySelector('app-search-box script')).toBeNull();
      expect(snippet.querySelectorAll('*').length).toBe(
        snippet.querySelectorAll(':scope > span, :scope > mark').length,
      );
    });
  });

  // Case 4
  describe('Include archived', () => {
    // FE-SRCH-03
    it('sends includeArchived=true at once and marks archived results', async () => {
      await startSignedIn();
      await openTaskList();
      await typeQuery('notes');
      expectSearch(dropdownParams('notes')).flush(searchBody());
      answerProjects();
      await settle();
      expect(text('app-search-box .state')).toBe(
        'No tasks or projects match “notes”. Archived items are hidden.',
      );

      const toggle = el<HTMLInputElement>('app-search-box .archived-toggle input');
      expect(toggle.checked).toBe(false);
      await immediately(() => {
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));
      });

      const archivedNote = taskHit(apiTask(50, 'Old notes'), {
        isArchived: true,
        archivedAt: '2026-11-20T00:00:00.000Z',
      });
      expectSearch(dropdownParams('notes', true)).flush(searchBody([archivedNote]));
      await settle();

      expect(optionTitles()).toEqual(['Old notes']);
      expect(clean(options()[0].querySelector('.tag.archived')?.textContent)).toBe('Archived');
      expect(document.activeElement).toBe(box());
    });
  });

  // Case 5
  describe('Keyboard navigation', () => {
    // FE-SRCH-02
    it('moves with the arrow keys and opens the selected task in its project with Enter', async () => {
      await startSignedIn();
      await openTaskList();
      await searchWrit();
      const activeTitle = () =>
        clean(
          page()
            .querySelector(`#${box().getAttribute('aria-activedescendant')}`)
            ?.querySelector('.title')?.textContent,
        );

      expect(box().getAttribute('aria-activedescendant')).toBeNull();
      key(box(), { key: 'ArrowDown' });
      expect(activeTitle()).toBe('Write report');
      key(box(), { key: 'ArrowDown' });
      key(box(), { key: 'ArrowDown' });
      expect(activeTitle()).toBe('Writing club');
      // Wraps around both ways.
      key(box(), { key: 'ArrowDown' });
      expect(activeTitle()).toBe('Write report');
      key(box(), { key: 'ArrowUp' });
      key(box(), { key: 'ArrowUp' });
      expect(activeTitle()).toBe('Make slides');
      expect(options()[1].getAttribute('aria-selected')).toBe('true');

      key(box(), { key: 'Enter' });
      await settle();
      expect(router.url).toBe(`/projects/${CAPSTONE.id}/tasks/${SLIDES.id}/edit`);
      expect(el('app-search-box .panel')).toBeNull();
      // The edit page loads; its own requests are not under test here.
      http.match(() => true);
    });

    // FE-SRCH-02
    it('opens a selected project at its task list', async () => {
      await startSignedIn();
      await openTaskList();
      await searchWrit();

      key(box(), { key: 'ArrowUp' });
      key(box(), { key: 'Enter' });
      await settle();
      expect(router.url).toBe(`/projects/${WRITING_CLUB.id}/tasks`);
      http.match(() => true);
    });

    // FE-SRCH-02
    it('closes with Escape without leaving the page', async () => {
      await startSignedIn();
      await openTaskList();
      await searchWrit();

      key(box(), { key: 'ArrowDown' });
      key(box(), { key: 'Escape' });
      await settle();
      expect(el('app-search-box .panel')).toBeNull();
      expect(box().getAttribute('aria-expanded')).toBe('false');
      expect(box().getAttribute('aria-activedescendant')).toBeNull();
      expect(router.url).toBe(`/projects/${CAPSTONE.id}/tasks`);
    });
  });

  // Case 6
  describe('The /search page', () => {
    // FE-SRCH-01, FE-SRCH-02
    it('shows every result for ?q= with All, Tasks and Projects tabs', async () => {
      await startSignedIn();
      await harness.navigateByUrl('/search?q=writ');
      await settle();
      expectSearch({ q: 'writ', type: 'all', limit: '20', includeArchived: 'false' }).flush(
        searchBody([REPORT_HIT, SLIDES_HIT], [CLUB_HIT], { tasks: 3 }),
      );
      answerProjects();
      await settle();

      expect(text('app-search-page h1')).toBe('Search');
      expect(el<HTMLInputElement>('app-search-page input[name="q"]').value).toBe('writ');
      const tabs = all('app-search-page [role="tab"]');
      expect(
        tabs.map((t) => [...t.querySelectorAll('span')].map((part) => clean(part.textContent))),
      ).toEqual([
        ['All', '4'],
        ['Tasks', '3'],
        ['Projects', '1'],
      ]);
      expect(all('app-search-page .row .title').map((t) => clean(t.textContent))).toEqual([
        'Write report',
        'Make slides',
        'Writing club',
      ]);
      expect(text('app-search-page .more')).toBe(
        '1 more match not shown. Add words to narrow your search.',
      );

      // The tabs filter the results already loaded; the URL keeps the choice.
      await press(tabs[2]);
      expect(router.url).toBe('/search?q=writ&type=projects');
      expect(all('app-search-page .row .title').map((t) => clean(t.textContent))).toEqual([
        'Writing club',
      ]);
      await press(all('app-search-page [role="tab"]')[1]);
      expect(all('app-search-page .row .title').map((t) => clean(t.textContent))).toEqual([
        'Write report',
        'Make slides',
      ]);

      // Opening a result goes to the task.
      await press(all('app-search-page button.row')[0]);
      expect(router.url).toBe(`/projects/${CAPSTONE.id}/tasks/${REPORT.id}/edit`);
      http.match(() => true);
    });
  });

  // Case 7
  describe('Empty and error states', () => {
    // FE-SRCH-04
    it('shows the empty state when nothing matches', async () => {
      await startSignedIn();
      await openTaskList();
      await typeQuery('zzz');
      expectSearch(dropdownParams('zzz')).flush(searchBody());
      answerProjects();
      await settle();

      expect(options()).toEqual([]);
      expect(text('app-search-box .state')).toBe(
        'No tasks or projects match “zzz”. Archived items are hidden.',
      );
      expect(text('app-search-box [aria-live="polite"]')).toBe('No results');
    });

    // FE-SRCH-04
    it('shows an error with Try again on a 500, which sends the query again', async () => {
      await startSignedIn();
      await openTaskList();
      await typeQuery('writ');
      expectSearch(dropdownParams('writ')).flush(
        SERVER_ERROR,
        status(500, 'Internal Server Error'),
      );
      answerProjects();
      await settle();

      expect(text('app-search-box [role="alert"] p')).toBe("Search isn't working right now.");
      const retry = all('app-search-box [role="alert"] button').find(
        (b) => clean(b.textContent) === 'Try again',
      );
      await immediately(() => retry!.click());
      expectSearch(dropdownParams('writ')).flush(WRIT_RESULTS);
      await settle();

      expect(el('app-search-box [role="alert"]')).toBeNull();
      expect(optionTitles()).toEqual(['Write report', 'Make slides', 'Writing club']);
    });

    // FE-SRCH-04
    it('clears the session and opens /login on a 401', async () => {
      await startSignedIn();
      await openTaskList();
      await typeQuery('writ');
      expectSearch(dropdownParams('writ')).flush(TOKEN_REJECTED, status(401, 'Unauthorized'));
      answerProjects();
      await settle();

      expect(router.url).toBe('/login');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });
});
