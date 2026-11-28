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
import type {
  ApiTimeline,
  ApiTimelineBar,
} from '../../../../src/app/features/tasks/task-views/timeline-view/types/task-timeline.types';
import { environment } from '../../../../src/environments/environment';

/**
 * Timeline View frontend integration tests (Sprint 6: FE-TML rows).
 *
 * The app runs through its real /projects/:projectId/tasks?view=timeline route behind authGuard:
 * the task list page, the view switcher, the Timeline view with its header, bars and the
 * TaskTimelineService, the new-task dialog that opens a task, TaskService and authInterceptor.
 * providePriorityLevels() and provideUserSettings() are registered as in app.config.ts.
 *
 * Only the network and the clock are faked. The clock is set to Thursday 19 November 2026, noon
 * in the user's timezone (Asia/Manila), so the week on screen is Mon 16 – Sun 22 November. Only
 * Date is faked, and it keeps ticking, so Angular, the router and rxjs keep their real timers.
 * Bodies follow the backend: TimelineResponse from task-timeline.service.ts
 * (`{ from, to, projects: [{ projectId, projectName, projectColor, bars }], undatedCount }`, each
 * bar from toTimelineTaskModel), owned-project's 404, require-auth's 401 and the error handler's
 * 500. http.verify() runs after every test.
 */

const API = `${environment.apiBaseUrl}/api`;
const AUTH_API = `${API}/auth`;
const TASKS_API = `${API}/tasks`;
const TIMELINE_API = `${TASKS_API}/timeline`;
const PROJECTS_API = `${API}/projects`;
const LABELS_API = `${API}/labels`;
const PRIORITIES_API = `${API}/priorities`;
const SETTINGS_API = `${API}/settings`;
const TOKEN = 'session-token';

/** Thursday 19 November 2026, 12:00 in Manila. */
const NOW = '2026-11-19T04:00:00.000Z';
const WEEK = { from: '2026-11-16', to: '2026-11-22' };

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

const LEVELS = [
  {
    id: 1,
    name: 'High',
    color: '#D84A4A',
    sortOrder: 0,
    isDefault: false,
    taskCount: 0,
    ...STAMPS,
  },
  {
    id: 2,
    name: 'Medium',
    color: '#D59B38',
    sortOrder: 1,
    isDefault: true,
    taskCount: 0,
    ...STAMPS,
  },
  { id: 3, name: 'Low', color: '#6E9F79', sortOrder: 2, isDefault: false, taskCount: 0, ...STAMPS },
];

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

/** A bar as toTimelineTaskModel sends it. */
function bar(
  id: number,
  title: string,
  start: string,
  end = start,
  overrides: Partial<ApiTimelineBar> = {},
): ApiTimelineBar {
  return {
    id,
    title,
    projectId: CAPSTONE.id,
    projectName: CAPSTONE.name,
    projectColor: CAPSTONE.color,
    start,
    end,
    isDone: false,
    isOverdue: false,
    priority: 'medium',
    ...overrides,
  };
}

/** A TimelineResponse for one window, with every bar in Capstone. */
function timeline(window: { from: string; to: string }, bars: ApiTimelineBar[], undatedCount = 0) {
  const body: ApiTimeline = {
    from: window.from,
    to: window.to,
    projects: bars.length
      ? [
          {
            projectId: CAPSTONE.id,
            projectName: CAPSTONE.name,
            projectColor: CAPSTONE.color,
            bars,
          },
        ]
      : [],
    undatedCount,
  };
  return body;
}

// Wed 18 – Thu 19: the third and fourth of seven columns.
const OUTLINE = bar(51, 'Outline chapter', '2026-11-18', '2026-11-19');
// Sat 21 only: the sixth column.
const SLIDES = bar(52, 'Make slides', '2026-11-21');
const WEEK_BARS = [OUTLINE, SLIDES];

/** A task as toTaskModel sends it, for the edit dialog. */
function apiTask(id: number, title: string, overrides: Partial<ApiTask> = {}): ApiTask {
  return {
    id,
    projectId: CAPSTONE.id,
    position: 1,
    title,
    description: null,
    priority: { id: 2, name: 'Medium', color: '#D59B38', sortOrder: 1 },
    scheduledDate: '2026-11-18',
    dueDate: '2026-11-19',
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

// Bodies from owned-project.middleware.ts, require-auth.middleware.ts and error-handler.middleware.ts.
const PROJECT_NOT_FOUND = { error: 'Project not found' };
const TOKEN_REJECTED = { error: 'Token invalid or expired' };
const SERVER_ERROR = { error: 'Internal server error' };
const status = (code: number, statusText = 'Error') => ({ status: code, statusText });

describe('Task timeline integration (Timeline view + API)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.fixture.nativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const clean = (value: string | null | undefined) => value?.trim().replace(/\s+/g, ' ') ?? '';
  const text = (selector: string) => clean(el(selector)?.textContent);

  /** A bar's host element, which carries its left and width. */
  const barHost = (title: string) =>
    all('app-timeline-bar').find(
      (host) => clean(host.querySelector('.title')?.textContent) === title,
    )!;
  const barBox = (title: string) => barHost(title).querySelector<HTMLElement>('.bar')!;
  const barTitles = () =>
    all('app-timeline-bar')
      .filter((host) => host.style.display !== 'none')
      .map((host) => clean(host.querySelector('.title')?.textContent));
  /** Left and width as percentages of the window. */
  const placement = (title: string) => ({
    left: parseFloat(barHost(title).style.left),
    width: parseFloat(barHost(title).style.width),
  });
  const rangeLabel = () => text('app-timeline-header .range');
  const navButton = (label: string) =>
    all('app-timeline-header button').find(
      (b) => b.getAttribute('aria-label') === label || clean(b.textContent) === label,
    ) as HTMLButtonElement;
  const zoomButton = (label: string) =>
    all('app-timeline-header .zoom-option').find((b) => clean(b.textContent) === label)!;
  const showCompleted = () =>
    el<HTMLInputElement>('app-timeline-header .completed input[type="checkbox"]');

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

  /** The one pending GET /api/tasks/timeline, carrying the session token. */
  function expectTimeline(): TestRequest {
    const req = http.expectOne((r) => r.method === 'GET' && r.url === TIMELINE_API);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    return req;
  }

  /** Opens the project's timeline and returns its first request, not yet answered. */
  async function openTimeline(query = ''): Promise<TestRequest> {
    await harness.navigateByUrl(`/projects/${CAPSTONE.id}/tasks?view=timeline${query}`);
    await settle();
    http.match(LABELS_API).forEach((req) => req.flush([]));
    http.expectOne(`${PROJECTS_API}/${CAPSTONE.id}`).flush(CAPSTONE);
    await settle();
    return expectTimeline();
  }

  /** Opens the timeline and shows `body`. */
  async function openWith(body: ApiTimeline = timeline(WEEK, WEEK_BARS)): Promise<TestRequest> {
    const req = await openTimeline();
    req.flush(body);
    await settle();
    return req;
  }

  /** Clicks a control and answers the timeline request it causes with the bars for its window. */
  async function stepTo(
    control: HTMLElement,
    window: { from: string; to: string },
    bars: ApiTimelineBar[] = [],
  ): Promise<TestRequest> {
    await press(control);
    const req = expectTimeline();
    expect(paramsOf(req)).toEqual({ ...window, projectId: `${CAPSTONE.id}` });
    req.flush(timeline(window, bars));
    await settle();
    return req;
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Only Date, and it keeps ticking from NOW, so every other timer stays real.
    vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
    vi.setSystemTime(new Date(NOW));
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

  // Case 1 — FE-TML-01
  describe('Loading the visible week', () => {
    it('requests Monday to Sunday of this week with from and to, and only that', async () => {
      await startSignedIn();
      const req = await openTimeline();

      expect(paramsOf(req)).toEqual({ ...WEEK, projectId: `${CAPSTONE.id}` });
      // A skeleton until the answer arrives.
      expect(el('.skeleton').getAttribute('aria-label')).toBe('Loading timeline');
      req.flush(timeline(WEEK, WEEK_BARS));
      await settle();

      expect(el('.skeleton')).toBeNull();
      expect(rangeLabel()).toBe('Nov 16 – 22, 2026');
      expect(
        all('.days .day').map((day) =>
          [...day.querySelectorAll(':scope > span')].map((s) => clean(s.textContent)).join(' '),
        ),
      ).toEqual(['Mon 16', 'Tue 17', 'Wed 18', 'Thu 19', 'Fri 20', 'Sat 21', 'Sun 22']);
      expect(clean(el('.days .day.today .num').textContent)).toBe('19');
      // The today line sits in the middle of Thursday's column: (3 + 0.5) / 7.
      expect(parseFloat(el('.today-line').style.left)).toBeCloseTo(50, 5);
      expect(navButton('Today').disabled).toBe(true);
      // Nothing else is fetched for the timeline: no GET /api/tasks list.
      http.expectNone((r) => r.url === TASKS_API);
    });

    it('places each bar from the start of its first day to the end of its last', async () => {
      await startSignedIn();
      await openWith();

      expect(text('.group .group-name')).toBe('Capstone');
      expect(barTitles()).toEqual(['Outline chapter', 'Make slides']);
      // Wed 18 – Thu 19: from 2/7 for 2/7 of the week.
      expect(placement('Outline chapter').left).toBeCloseTo((2 / 7) * 100, 5);
      expect(placement('Outline chapter').width).toBeCloseTo((2 / 7) * 100, 5);
      // Sat 21: from 5/7 for 1/7.
      expect(placement('Make slides').left).toBeCloseTo((5 / 7) * 100, 5);
      expect(placement('Make slides').width).toBeCloseTo((1 / 7) * 100, 5);
      expect(barHost('Outline chapter').querySelector('.title')!.getAttribute('aria-label')).toBe(
        'Outline chapter, Nov 18 – Nov 19, 2026',
      );
      expect(barBox('Outline chapter').classList).not.toContain('cut-start');
      expect(barBox('Outline chapter').classList).not.toContain('cut-end');
    });
  });

  // Case 2 — FE-TML-02
  describe('Zoom and moving between windows', () => {
    it('requests the whole month on Month, keeping today in view', async () => {
      await startSignedIn();
      await openWith();

      await stepTo(zoomButton('Month'), { from: '2026-11-01', to: '2026-11-30' }, WEEK_BARS);

      expect(zoomButton('Month').getAttribute('aria-pressed')).toBe('true');
      expect(zoomButton('Week').getAttribute('aria-pressed')).toBe('false');
      expect(rangeLabel()).toBe('November 2026');
      expect(all('.days .day')).toHaveLength(30);
      // Wed 18 is the 18th of 30 days.
      expect(placement('Outline chapter').left).toBeCloseTo((17 / 30) * 100, 5);
      expect(placement('Outline chapter').width).toBeCloseTo((2 / 30) * 100, 5);

      await stepTo(zoomButton('Week'), WEEK, WEEK_BARS);
      expect(rangeLabel()).toBe('Nov 16 – 22, 2026');
    });

    it('requests the next and previous week, and comes back with Today', async () => {
      await startSignedIn();
      await openWith();

      await stepTo(navButton('Next week'), { from: '2026-11-23', to: '2026-11-29' });
      expect(rangeLabel()).toBe('Nov 23 – 29, 2026');
      expect(el('.days .day.today')).toBeNull();
      expect(el('.today-line')).toBeNull();
      expect(navButton('Today').disabled).toBe(false);

      await stepTo(navButton('Next week'), { from: '2026-11-30', to: '2026-12-06' });
      expect(rangeLabel()).toBe('Nov 30 – Dec 6, 2026');

      await stepTo(navButton('Previous week'), { from: '2026-11-23', to: '2026-11-29' });

      await stepTo(navButton('Today'), WEEK, WEEK_BARS);
      expect(rangeLabel()).toBe('Nov 16 – 22, 2026');
      expect(navButton('Today').disabled).toBe(true);
      expect(barTitles()).toEqual(['Outline chapter', 'Make slides']);

      await stepTo(navButton('Previous week'), { from: '2026-11-09', to: '2026-11-15' });
      expect(rangeLabel()).toBe('Nov 9 – 15, 2026');
    });

    it('moves a month at a time on Month', async () => {
      await startSignedIn();
      await openWith();
      await stepTo(zoomButton('Month'), { from: '2026-11-01', to: '2026-11-30' });

      await stepTo(navButton('Next month'), { from: '2026-12-01', to: '2026-12-31' });
      expect(rangeLabel()).toBe('December 2026');
      await stepTo(navButton('Next month'), { from: '2027-01-01', to: '2027-01-31' });
      expect(rangeLabel()).toBe('January 2027');
      await stepTo(navButton('Previous month'), { from: '2026-12-01', to: '2026-12-31' });

      await stepTo(navButton('Today'), { from: '2026-11-01', to: '2026-11-30' });
      expect(rangeLabel()).toBe('November 2026');
    });

    it('shows each answer, not the previous window’s bars', async () => {
      await startSignedIn();
      await openWith();

      const next = bar(61, 'Submit draft', '2026-11-25');
      await stepTo(navButton('Next week'), { from: '2026-11-23', to: '2026-11-29' }, [next]);

      expect(barTitles()).toEqual(['Submit draft']);
      expect(placement('Submit draft').left).toBeCloseTo((2 / 7) * 100, 5);
    });
  });

  // Case 3 — FE-TML-02
  describe('Clamping, styles and Show completed', () => {
    it('cuts bars that cross either edge of the window and marks the cut', async () => {
      const spanning = bar(53, 'Write thesis', '2026-11-10', '2026-11-30');
      const before = bar(54, 'Research', '2026-11-12', '2026-11-17');
      const after = bar(55, 'Revise', '2026-11-21', '2026-11-27');
      await startSignedIn();
      await openWith(timeline(WEEK, [spanning, before, after]));

      expect(placement('Write thesis')).toEqual({ left: 0, width: 100 });
      expect(barBox('Write thesis').classList).toContain('cut-start');
      expect(barBox('Write thesis').classList).toContain('cut-end');
      expect(
        [...barBox('Write thesis').querySelectorAll('.cut')].map((c) => c.textContent),
      ).toEqual(['‹', '›']);

      // Starts before Monday, ends Tuesday: Mon – Tue.
      expect(placement('Research').left).toBe(0);
      expect(placement('Research').width).toBeCloseTo((2 / 7) * 100, 5);
      expect(barBox('Research').classList).toContain('cut-start');
      expect(barBox('Research').classList).not.toContain('cut-end');

      // Starts Saturday, ends after Sunday: Sat – Sun.
      expect(placement('Revise').left).toBeCloseTo((5 / 7) * 100, 5);
      expect(placement('Revise').width).toBeCloseTo((2 / 7) * 100, 5);
      expect(barBox('Revise').classList).not.toContain('cut-start');
      expect(barBox('Revise').classList).toContain('cut-end');
    });

    it('styles overdue and completed bars', async () => {
      const late = bar(56, 'Email adviser', '2026-11-16', '2026-11-17', { isOverdue: true });
      const done = bar(57, 'Book room', '2026-11-17', '2026-11-17', { isDone: true });
      await startSignedIn();
      await openWith(timeline(WEEK, [late, done, SLIDES]));

      expect(barBox('Email adviser').classList).toContain('overdue');
      expect(barBox('Email adviser').classList).not.toContain('done');
      expect(barHost('Email adviser').querySelector('.title')!.getAttribute('aria-label')).toBe(
        'Email adviser, Nov 16 – Nov 17, 2026, Overdue',
      );

      expect(barBox('Book room').classList).toContain('done');
      expect(barHost('Book room').querySelector('.check')!.getAttribute('aria-checked')).toBe(
        'true',
      );
      expect(barHost('Book room').querySelector('.title')!.getAttribute('aria-label')).toBe(
        'Book room, Nov 17, 2026, Completed',
      );

      expect(barBox('Make slides').classList).not.toContain('overdue');
      expect(barBox('Make slides').classList).not.toContain('done');
    });

    it('asks again with includeCompleted=true when Show completed is ticked, and without when unticked', async () => {
      await startSignedIn();
      await openWith();
      expect(showCompleted().checked).toBe(false);

      await press(showCompleted());
      const withDone = expectTimeline();
      expect(paramsOf(withDone)).toEqual({
        ...WEEK,
        projectId: `${CAPSTONE.id}`,
        includeCompleted: 'true',
      });
      const done = bar(57, 'Book room', '2026-11-17', '2026-11-17', { isDone: true });
      withDone.flush(timeline(WEEK, [done, ...WEEK_BARS]));
      await settle();
      expect(showCompleted().checked).toBe(true);
      expect(barTitles()).toEqual(['Book room', 'Outline chapter', 'Make slides']);
      expect(barBox('Book room').classList).toContain('done');

      // It stays on while moving between weeks.
      await press(navButton('Next week'));
      expect(paramsOf(expectTimeline())).toMatchObject({ includeCompleted: 'true' });
      http.match(TIMELINE_API);

      await press(showCompleted());
      const without = expectTimeline();
      expect(paramsOf(without)).toEqual({
        from: '2026-11-23',
        to: '2026-11-29',
        projectId: `${CAPSTONE.id}`,
      });
      without.flush(timeline({ from: '2026-11-23', to: '2026-11-29' }, []));
      await settle();
    });
  });

  // Case 4 — FE-TML-01
  describe('Opening a task from its bar', () => {
    async function expectEditDialog(): Promise<void> {
      expect(el('app-new-task-dialog')).not.toBeNull();
      // The dialog loads the task it edits, plus the projects and labels its form offers.
      const task = http.expectOne({ method: 'GET', url: `${TASKS_API}/${OUTLINE.id}` });
      expect(task.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
      task.flush(apiTask(OUTLINE.id, OUTLINE.title));
      http.match((r) => r.url.startsWith(PROJECTS_API)).forEach((r) => r.flush([CAPSTONE]));
      http.match(LABELS_API).forEach((r) => r.flush([]));
      await settle();
      const title = document.querySelector<HTMLInputElement>('app-new-task-dialog #task-title');
      expect(title?.value).toBe('Outline chapter');
    }

    it('opens the task when its bar is clicked', async () => {
      await startSignedIn();
      await openWith();
      expect(el('app-new-task-dialog')).toBeNull();

      await press(barBox('Outline chapter'));
      await expectEditDialog();
      // Opening sends no change.
      http.expectNone((r) => r.method === 'PUT');
    });

    it('opens the task with Enter on its title, a native button', async () => {
      await startSignedIn();
      await openWith();

      const title = barHost('Outline chapter').querySelector<HTMLButtonElement>('button.title')!;
      // A native <button type="button">: Enter and Space activate it as a click, which the bar
      // handles. The test DOM does not turn a key press into that click, so it sends both.
      expect(title.tagName).toBe('BUTTON');
      expect(title.type).toBe('button');
      title.focus();
      expect(document.activeElement).toBe(title);
      title.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await press(title);

      await expectEditDialog();
    });

    it('does not open the task when its checkbox is clicked', async () => {
      await startSignedIn();
      await openWith();

      await press(barHost('Outline chapter').querySelector<HTMLElement>('.check')!);

      expect(el('app-new-task-dialog')).toBeNull();
      const put = http.expectOne({ method: 'PUT', url: `${TASKS_API}/${OUTLINE.id}` });
      expect(put.request.body).toEqual({ isDone: true, doneAt: expect.any(String) });
      put.flush({ id: OUTLINE.id, isDone: true, doneAt: NOW, position: 1 });
      await settle();
      // The timeline reloads quietly after a change.
      expectTimeline().flush(timeline(WEEK, [{ ...OUTLINE, isDone: true }, SLIDES]));
      await settle();
    });
  });

  // Case 5
  describe('Undated tasks', () => {
    it('counts undated tasks and links to the List view', async () => {
      await startSignedIn();
      await openWith(timeline(WEEK, WEEK_BARS, 2));

      expect(text('.undated')).toBe('2 undated tasks not shown. See them in the List view');
      const link = el<HTMLAnchorElement>('.undated a');
      // It names List, so it wins over the timeline this project remembers.
      expect(link.getAttribute('href')).toBe(`/projects/${CAPSTONE.id}/tasks?view=list`);

      await press(link);

      expect(urlParams()).toEqual({ view: 'list' });
      expect(el('app-timeline-view')).toBeNull();
      const list = http.expectOne(
        (r) =>
          r.method === 'GET' &&
          r.url === TASKS_API &&
          r.params.get('projectId') === `${CAPSTONE.id}`,
      );
      list.flush([apiTask(58, 'Plan party', { scheduledDate: null, dueDate: null })]);
      await settle();
      expect(el('app-list-view')).not.toBeNull();
      expect(clean(el('app-list-view app-task-item .title').textContent)).toBe('Plan party');
    });

    it('says "task" for one and hides the message when there are none', async () => {
      await startSignedIn();
      await openWith(timeline(WEEK, WEEK_BARS, 1));
      expect(text('.undated')).toContain('1 undated task not shown.');

      await press(navButton('Next week'));
      expectTimeline().flush(timeline({ from: '2026-11-23', to: '2026-11-29' }, [], 0));
      await settle();
      expect(el('.undated')).toBeNull();
    });
  });

  // Case 6 — FE-TML-04
  describe('Empty and failed timelines', () => {
    it('shows the empty state for a week with no bars', async () => {
      await startSignedIn();
      await openWith(timeline(WEEK, []));

      expect(text('.empty .empty-title')).toBe('Nothing scheduled this week.');
      expect(el('app-timeline-bar')).toBeNull();

      await press(zoomButton('Month'));
      expectTimeline().flush(timeline({ from: '2026-11-01', to: '2026-11-30' }, []));
      await settle();
      expect(text('.empty .empty-title')).toBe('Nothing scheduled this month.');
    });

    it('shows the filter empty state while filters are applied', async () => {
      await startSignedIn();
      const req = await openTimeline('&priorities=high');
      expect(paramsOf(req)).toMatchObject({ ...WEEK, priority: 'high' });
      req.flush(timeline(WEEK, []));
      await settle();

      expect(text('.empty .empty-title')).toBe('No dated tasks match these filters.');
    });

    it('shows an error with Try again on a 500 and loads again on retry', async () => {
      await startSignedIn();
      (await openTimeline()).flush(SERVER_ERROR, status(500));
      await settle();

      expect(text('.load-error p')).toBe(
        "Couldn't load the timeline. Something went wrong. Please try again.",
      );
      expect(el('.load-error').getAttribute('role')).toBe('alert');

      await press(el('.load-error .retry'));
      expect(text('.load-error .retry')).toBe('Retrying…');
      const retry = expectTimeline();
      expect(paramsOf(retry)).toEqual({ ...WEEK, projectId: `${CAPSTONE.id}` });
      retry.flush(timeline(WEEK, WEEK_BARS));
      await settle();

      expect(el('.load-error')).toBeNull();
      expect(barTitles()).toEqual(['Outline chapter', 'Make slides']);
    });

    it('keeps the bars on screen when a later load fails', async () => {
      await startSignedIn();
      await openWith();

      await press(showCompleted());
      expectTimeline().flush(SERVER_ERROR, status(500));
      await settle();

      expect(text('.load-error p')).toContain("Couldn't load the timeline.");
      expect(barTitles()).toEqual(['Outline chapter', 'Make slides']);
    });

    it('says the project is gone on a 404, with Try again', async () => {
      await startSignedIn();
      (await openTimeline()).flush(PROJECT_NOT_FOUND, status(404, 'Not Found'));
      await settle();

      expect(text('.load-error p')).toBe(
        "Couldn't load the timeline. This project is no longer available.",
      );
      expect(el('.load-error .retry')).not.toBeNull();
    });

    it('clears the session and opens /login on a 401', async () => {
      await startSignedIn();
      (await openTimeline()).flush(TOKEN_REJECTED, status(401, 'Unauthorized'));
      await settle();

      expect(router.url).toBe('/login');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });
});
