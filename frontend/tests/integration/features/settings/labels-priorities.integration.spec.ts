import { CdkDropList } from '@angular/cdk/drag-drop';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  type TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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
 * Settings > Labels and Settings > Priorities frontend integration tests (Sprint 5: FE-LPM rows).
 *
 * The app runs through its real /settings/labels and /settings/priorities routes behind authGuard
 * and the settings layout, and through the real task list and task form, with the real
 * LabelsService, PrioritiesService, PrioritiesStore, SettingsStore, TaskService, TasksStore and
 * authInterceptor. providePriorityLevels() and provideUserSettings() are registered as in
 * app.config.ts, so signing in loads the user's levels and settings. The user is signed in by
 * restoring a stored token and answering GET /api/auth/me.
 *
 * Only the network is faked. Bodies follow the backend: toLabelModel
 * (backend/src/features/labels/shared/models/label.model.ts), toPriorityModel
 * (backend/src/features/priorities/priority-crud/models/priority.model.ts), toTaskModel and the
 * controllers' status codes and error bodies. PUT /api/labels/reorder has no backend route yet, so
 * its body follows the Sprint 5 API specification.
 */

const API = `${environment.apiBaseUrl}/api`;
const AUTH_API = `${API}/auth`;
const LABELS_API = `${API}/labels`;
const PRIORITIES_API = `${API}/priorities`;
const SETTINGS_API = `${API}/settings`;
const PROJECTS_API = `${API}/projects`;
const TASKS_API = `${API}/tasks`;
const TOKEN = 'session-token';

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
  color: string | null;
  sortOrder: number;
  isDefault: boolean;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
};

/** A priority level as toPriorityModel sends it. */
function priority(
  id: number,
  name: string,
  color: string,
  sortOrder: number,
  overrides: Partial<ApiPriority> = {},
): ApiPriority {
  return { id, name, color, sortOrder, isDefault: false, taskCount: 0, ...STAMPS, ...overrides };
}

// Custom names, so tasks carry their level as an object (see toTaskModel).
const URGENT = priority(11, 'Urgent', '#B91C1C', 1, { taskCount: 2 });
const NORMAL = priority(12, 'Normal', '#F59E0B', 2, { isDefault: true, taskCount: 5 });
const SOMEDAY = priority(13, 'Someday', '#94A3B8', 3);
const PRIORITIES = [URGENT, NORMAL, SOMEDAY];

type ApiLabel = {
  id: number;
  name: string;
  color: string | null;
  sortOrder: number;
  isArchived: boolean;
  archivedAt: string | null;
  taskCount?: number;
  createdAt: string;
  updatedAt: string;
};

/** A label as toLabelModel sends it; the list adds taskCount, single-label responses do not. */
function label(
  id: number,
  name: string,
  color: string | null,
  sortOrder: number,
  taskCount?: number,
): ApiLabel {
  return {
    id,
    name,
    color,
    sortOrder,
    isArchived: false,
    archivedAt: null,
    ...(taskCount === undefined ? {} : { taskCount }),
    ...STAMPS,
  };
}

const PLANNING = label(21, 'Planning', '#2563EB', 0, 3);
const FOLLOW_UP = label(22, 'Follow-up', '#D97706', 1, 1);
const IDEAS = label(23, 'Ideas', '#9333EA', 2, 0);
const LABELS = [PLANNING, FOLLOW_UP, IDEAS];

const CAPSTONE = {
  id: 10,
  name: 'Capstone',
  description: null,
  color: null,
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 1,
  ...STAMPS,
};
const INBOX = { ...CAPSTONE, id: 1, name: 'Inbox', isInbox: true, sortOrder: 0 };

/** A task as toTaskModel sends it, on one of the user's own levels. */
function apiTask(id: number, title: string, level: ApiPriority): ApiTask {
  return {
    id,
    projectId: CAPSTONE.id,
    title,
    description: null,
    priority: { id: level.id, name: level.name, color: level.color, sortOrder: level.sortOrder },
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
  } as ApiTask;
}

const status = (code: number, statusText = 'Error') => ({ status: code, statusText });

describe('Labels & Priorities integration (Settings, task form and filters + API)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.fixture.nativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const clean = (value: string | null | undefined) => value?.trim().replace(/\s+/g, ' ') ?? '';
  const text = (selector: string) => clean(el(selector)?.textContent);
  const byLabel = (label: string) => el<HTMLButtonElement>(`button[aria-label="${label}"]`);

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  function type(selector: string, value: string): void {
    const input = el<HTMLInputElement>(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
  }

  function choose(selector: string, value: string): void {
    const select = el<HTMLSelectElement>(selector);
    select.value = value;
    select.dispatchEvent(new Event('change'));
    harness.detectChanges();
  }

  async function press(button: HTMLElement): Promise<void> {
    expect(button, 'button to press').toBeTruthy();
    button.click();
    await settle();
  }

  async function submit(formHost: string): Promise<void> {
    el<HTMLFormElement>(`${formHost} form`).dispatchEvent(new Event('submit'));
    await settle();
  }

  function expectAuthorized(req: TestRequest, method: string): TestRequest {
    expect(req.request.method).toBe(method);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    return req;
  }

  /**
   * Signs in the way a page load does: a stored token that GET /api/auth/me accepts. Signing in
   * makes the app load the user's priority levels and settings, as app.config.ts does.
   */
  async function startSignedIn(levels: ApiPriority[] = PRIORITIES): Promise<void> {
    localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    http.expectOne(`${AUTH_API}/me`).flush(USER);
    await settle();
    answerPriorities(levels);
    http.match(SETTINGS_API).forEach((req) => req.flush(SETTINGS));
    await settle();
  }

  function answerPriorities(levels: ApiPriority[] = PRIORITIES): void {
    const requests = http.match(PRIORITIES_API);
    expect(requests.length, 'GET /api/priorities').toBeGreaterThan(0);
    requests.forEach((req) => expectAuthorized(req, 'GET').flush(levels));
  }

  function expectLabelList(archived: boolean): TestRequest {
    const req = http.expectOne(
      (r) => r.url === LABELS_API && r.params.get('isArchived') === String(archived),
    );
    return expectAuthorized(req, 'GET');
  }

  async function openLabels(active: ApiLabel[] = LABELS, archived: ApiLabel[] = []): Promise<void> {
    await harness.navigateByUrl('/settings/labels');
    await settle();
    expectLabelList(false).flush(active);
    expectLabelList(true).flush(archived);
    await settle();
  }

  async function openPriorities(levels: ApiPriority[] = PRIORITIES): Promise<void> {
    await harness.navigateByUrl('/settings/priorities');
    await settle();
    // The page asks again on open, for fresh task counts.
    answerPriorities(levels);
    await settle();
  }

  /** Each row's name, and its task count when shown, top to bottom. */
  function rows(list: string): string[] {
    return all(`ul[aria-label="${list}"] > li.row`).map((row) => {
      const name = clean(row.querySelector('.name')?.textContent);
      const badge = row.querySelector('.badge') ? ' [Default]' : '';
      const count = row.querySelector('.count')?.textContent;
      return `${name}${badge}${count ? ` (${clean(count)})` : ''}`;
    });
  }

  function toasts(): string[] {
    return all('app-toast-outlet .toast > span').map((message) => clean(message.textContent));
  }

  /**
   * The labels page asks for active and archived labels together; when one fails, the other is
   * cancelled. Clears that leftover request so http.verify() only reports real strays.
   */
  function dropArchivedLabelRequest(): void {
    http
      .match((r) => r.url === LABELS_API && r.params.get('isArchived') === 'true')
      .forEach((req) => {
        if (!req.cancelled) req.flush([]);
      });
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
        providePriorityLevels(),
        provideUserSettings(),
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
  describe('Settings layout', () => {
    // FE-LPM-01, FE-LPM-04 (the pages are reachable)
    it('shows every settings tab and still opens /settings/profile', async () => {
      await startSignedIn();

      await harness.navigateByUrl('/settings');
      await settle();
      http.expectOne(`${AUTH_API}/profile`).flush({
        id: USER.id,
        username: USER.username,
        email: USER.email,
        timezone: USER.timezone,
      });
      await settle();

      expect(router.url).toBe('/settings/profile');
      const tabs = all('nav[aria-label="Settings sections"] a');
      expect(tabs.map((tab) => clean(tab.textContent))).toEqual([
        'Profile',
        'Preferences',
        'Config',
        'Labels',
        'Priorities',
      ]);
      expect(tabs.map((tab) => tab.getAttribute('href'))).toEqual([
        '/settings/profile',
        '/settings/preferences',
        '/settings/config',
        '/settings/labels',
        '/settings/priorities',
      ]);
      expect(tabs[0].getAttribute('aria-current')).toBe('page');
      expect(el('app-profile-settings')).toBeTruthy();

      await press(tabs[3]);
      expect(router.url).toBe('/settings/labels');
      expectLabelList(false).flush(LABELS);
      expectLabelList(true).flush([]);
      await settle();
      expect(all('nav[aria-label="Settings sections"] a')[3].getAttribute('aria-current')).toBe(
        'page',
      );
      expect(el('app-label-settings h2').textContent).toBe('Labels');
    });
  });

  // Case 2
  describe('Labels', () => {
    // FE-LPM-04
    it('lists the active labels in order with their task counts', async () => {
      await startSignedIn();
      await openLabels();

      expect(rows('Labels')).toEqual([
        'Planning (3 tasks)',
        'Follow-up (1 task)',
        'Ideas (0 tasks)',
      ]);
      const swatch = el<HTMLElement>('li[data-label-id="21"] .swatch');
      expect(swatch.style.backgroundColor).toBe('rgb(37, 99, 235)');
    });

    // FE-LPM-04
    it('creates a label, then renames and recolors one, keeping its task count', async () => {
      await startSignedIn();
      await openLabels();

      type('#new-label-name', '  Errands ');
      type('#new-label-color', '#16a34a');
      await submit('section[aria-label="New label"]');
      const create = expectAuthorized(http.expectOne(LABELS_API), 'POST');
      expect(create.request.body).toEqual({ name: 'Errands', color: '#16A34A' });
      create.flush(label(24, 'Errands', '#16A34A', 3), status(201, 'Created'));
      await settle();

      expect(rows('Labels')).toEqual([
        'Planning (3 tasks)',
        'Follow-up (1 task)',
        'Ideas (0 tasks)',
        'Errands',
      ]);
      expect(el<HTMLInputElement>('#new-label-name').value).toBe('');

      await press(el('#label-21-edit'));
      expect(el<HTMLInputElement>('#label-21-editor-name').value).toBe('Planning');
      type('#label-21-editor-name', 'Plans');
      type('#label-21-editor-color', '#0f766e');
      await submit('li[data-label-id="21"]');
      const update = expectAuthorized(http.expectOne(`${LABELS_API}/21`), 'PUT');
      expect(update.request.body).toEqual({ name: 'Plans', color: '#0F766E' });
      // PUT answers without taskCount; the page keeps the count it had.
      update.flush(label(21, 'Plans', '#0F766E', 0));
      await settle();

      expect(rows('Labels')[0]).toBe('Plans (3 tasks)');
      expect(el<HTMLElement>('li[data-label-id="21"] .swatch').style.backgroundColor).toBe(
        'rgb(15, 118, 110)',
      );
    });

    // FE-LPM-06
    it('blocks a name already in use and shows the 409 message the server sends for a duplicate', async () => {
      await startSignedIn();
      await openLabels();

      type('#new-label-name', 'planning');
      expect(text('#new-label-status')).toBe('Label “planning” already exists.');
      expect(el<HTMLButtonElement>('section[aria-label="New label"] .save').disabled).toBe(true);

      // Another tab made "Errands" since this page loaded; the server refuses it.
      type('#new-label-name', 'Errands');
      await submit('section[aria-label="New label"]');
      http
        .expectOne(LABELS_API)
        .flush(
          { code: 'label-name-taken', error: 'A label with this name already exists' },
          status(409, 'Conflict'),
        );
      await settle();

      expect(text('#new-label-status')).toBe('Label “Errands” already exists.');
      expect(rows('Labels')).toHaveLength(3);
    });

    // FE-LPM-04
    it('asks before deleting a label and says how many tasks lose it', async () => {
      await startSignedIn();
      await openLabels();

      await press(el('#label-21-delete'));
      const dialog = el('[role="alertdialog"]');
      expect(clean(dialog.querySelector('h3')?.textContent)).toBe('Delete “Planning”?');
      expect(text('#delete-label-impact')).toBe(
        "3 tasks will lose this label. This can't be undone.",
      );

      await press(el('#delete-label-cancel'));
      expect(el('[role="alertdialog"]')).toBeNull();
      http.expectNone(`${LABELS_API}/21`);

      await press(el('#label-21-delete'));
      await press(
        all('[role="alertdialog"] button').find((b) => clean(b.textContent) === 'Delete label')!,
      );
      const remove = expectAuthorized(http.expectOne(`${LABELS_API}/21`), 'DELETE');
      remove.flush(null, status(204, 'No Content'));
      await settle();

      expect(el('[role="alertdialog"]')).toBeNull();
      expect(rows('Labels')).toEqual(['Follow-up (1 task)', 'Ideas (0 tasks)']);
    });

    // FE-LPM-04
    it('reorders by drag and by keyboard, sending PUT /labels/reorder each time', async () => {
      await startSignedIn();
      await openLabels();

      // A drop from the CDK drop list, as dragging Planning to the bottom would emit.
      const dropList = harness.fixture.debugElement
        .query(By.css('ul[aria-label="Labels"]'))
        .injector.get(CdkDropList);
      dropList.dropped.emit({ previousIndex: 0, currentIndex: 2 } as never);
      await settle();
      const dragged = expectAuthorized(http.expectOne(`${LABELS_API}/reorder`), 'PUT');
      expect(dragged.request.body).toEqual({ labelIds: [22, 23, 21] });
      dragged.flush({ labelIds: [22, 23, 21] });
      await settle();
      expect(rows('Labels').map((row) => row.split(' (')[0])).toEqual([
        'Follow-up',
        'Ideas',
        'Planning',
      ]);

      await press(byLabel('Move Planning up'));
      const moved = expectAuthorized(http.expectOne(`${LABELS_API}/reorder`), 'PUT');
      expect(moved.request.body).toEqual({ labelIds: [22, 21, 23] });
      moved.flush({ labelIds: [22, 21, 23] });
      await settle();
      expect(rows('Labels').map((row) => row.split(' (')[0])).toEqual([
        'Follow-up',
        'Planning',
        'Ideas',
      ]);
      expect(text('app-label-settings [aria-live="polite"]')).toBe(
        'Planning moved to position 2 of 3.',
      );
    });

    // FE-LPM-06
    it('puts the old order back and says so when saving a new order fails', async () => {
      await startSignedIn();
      await openLabels();

      await press(byLabel('Move Ideas up'));
      expect(rows('Labels').map((row) => row.split(' (')[0])).toEqual([
        'Planning',
        'Ideas',
        'Follow-up',
      ]);
      http
        .expectOne(`${LABELS_API}/reorder`)
        .flush({ error: 'Internal server error' }, status(500, 'Server Error'));
      await settle();

      expect(rows('Labels').map((row) => row.split(' (')[0])).toEqual([
        'Planning',
        'Follow-up',
        'Ideas',
      ]);
      expect(toasts()).toContain("Couldn't save the new label order. It has been put back.");
    });
  });

  // Case 3
  describe('Priorities', () => {
    // FE-LPM-01
    it('lists the levels in order with the Default badge and task counts', async () => {
      await startSignedIn();
      await openPriorities();

      expect(rows('Priority levels')).toEqual([
        'Urgent (2 tasks)',
        'Normal [Default] (5 tasks)',
        'Someday (0 tasks)',
      ]);
      // The default level offers no "Set as default".
      expect(byLabel('Set Normal as default')).toBeNull();
      expect(byLabel('Set Urgent as default')).toBeTruthy();
    });

    // FE-LPM-01
    it('creates and edits a level and saves a new order', async () => {
      await startSignedIn();
      await openPriorities();

      type('#new-priority-name', 'Blocker');
      await submit('section[aria-label="New priority level"]');
      const create = expectAuthorized(http.expectOne(PRIORITIES_API), 'POST');
      expect(create.request.body).toEqual({ name: 'Blocker', color: '#7B23A8' });
      create.flush(priority(14, 'Blocker', '#7B23A8', 4), status(201, 'Created'));
      await settle();
      expect(rows('Priority levels').at(-1)).toBe('Blocker (0 tasks)');

      await press(el('#priority-11-edit'));
      type('#priority-11-editor-name', 'Critical');
      await submit('li[data-priority-id="11"]');
      const update = expectAuthorized(http.expectOne(`${PRIORITIES_API}/11`), 'PUT');
      expect(update.request.body).toEqual({ name: 'Critical', color: '#B91C1C' });
      update.flush({ ...URGENT, name: 'Critical' });
      await settle();
      expect(rows('Priority levels')[0]).toBe('Critical (2 tasks)');

      await press(byLabel('Move Someday up'));
      const reorder = expectAuthorized(http.expectOne(`${PRIORITIES_API}/reorder`), 'PUT');
      expect(reorder.request.body).toEqual({ priorityIds: [11, 13, 12, 14] });
      // The backend answers with the reordered levels.
      reorder.flush([
        { ...URGENT, name: 'Critical' },
        { ...SOMEDAY, sortOrder: 2 },
        { ...NORMAL, sortOrder: 3 },
        priority(14, 'Blocker', '#7B23A8', 4),
      ]);
      await settle();
      expect(rows('Priority levels').map((row) => row.split(' ')[0])).toEqual([
        'Critical',
        'Someday',
        'Normal',
        'Blocker',
      ]);
    });

    // FE-LPM-02
    it('makes another level the default', async () => {
      await startSignedIn();
      await openPriorities();

      await press(byLabel('Set Urgent as default'));
      const req = expectAuthorized(http.expectOne(`${PRIORITIES_API}/11/default`), 'PUT');
      expect(req.request.body).toBeNull();
      req.flush({ ...URGENT, isDefault: true });
      await settle();

      expect(rows('Priority levels')).toEqual([
        'Urgent [Default] (2 tasks)',
        'Normal (5 tasks)',
        'Someday (0 tasks)',
      ]);
      expect(byLabel('Set Normal as default')).toBeTruthy();
    });

    // FE-LPM-03
    it('requires a target before deleting a used level and sends reassignTo', async () => {
      await startSignedIn();
      await openPriorities();

      await press(el('#priority-11-delete'));
      expect(text('#delete-priority-impact')).toBe(
        '2 tasks use this level and will move to the level you choose.',
      );
      const options = [...el<HTMLSelectElement>('#reassign-priority').options].map((o) =>
        clean(o.textContent),
      );
      expect(options).toEqual(['Choose a level…', 'Normal (default)', 'Someday']);
      const confirm = () =>
        all('app-delete-priority-dialog button').find(
          (b) => clean(b.textContent) === 'Delete level',
        )!;

      await press(confirm());
      expect(text('#reassign-priority-status')).toBe('Choose where its tasks go.');
      http.expectNone((r) => r.method === 'DELETE');

      choose('#reassign-priority', '12');
      await press(confirm());
      const req = expectAuthorized(
        http.expectOne((r) => r.url === `${PRIORITIES_API}/11`),
        'DELETE',
      );
      expect(req.request.params.get('reassignTo')).toBe('12');
      // The backend answers with the deleted level.
      req.flush(URGENT);
      await settle();

      expect(el('app-delete-priority-dialog')).toBeNull();
      expect(rows('Priority levels')).toEqual(['Normal [Default] (7 tasks)', 'Someday (0 tasks)']);
    });

    // FE-LPM-03
    it('deletes an unused level without a target and offers no delete for the last level', async () => {
      await startSignedIn();
      await openPriorities();

      await press(el('#priority-13-delete'));
      expect(text('#delete-priority-impact')).toBe('No tasks use this level.');
      expect(el('#reassign-priority')).toBeNull();
      await press(
        all('app-delete-priority-dialog button').find(
          (b) => clean(b.textContent) === 'Delete level',
        )!,
      );
      const req = http.expectOne((r) => r.url === `${PRIORITIES_API}/13`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.params.has('reassignTo')).toBe(false);
      req.flush(SOMEDAY);
      await settle();
      expect(rows('Priority levels')).toEqual(['Urgent (2 tasks)', 'Normal [Default] (5 tasks)']);

      // A user with a single level.
      await harness.navigateByUrl('/settings/labels');
      await settle();
      expectLabelList(false).flush([]);
      expectLabelList(true).flush([]);
      await openPriorities([{ ...NORMAL, sortOrder: 0 }]);
      const onlyDelete = el<HTMLButtonElement>('#priority-12-delete');
      expect(onlyDelete.disabled).toBe(true);
      expect(onlyDelete.title).toBe('You need at least one priority level');
    });
  });

  // Case 4
  describe('Levels in the task list and task form', () => {
    function expectTaskList(params: Record<string, string> = {}): TestRequest {
      const req = http.expectOne(
        (r) =>
          r.method === 'GET' &&
          r.url === TASKS_API &&
          r.params.get('projectId') === `${CAPSTONE.id}` &&
          Object.entries(params).every(([key, value]) => r.params.get(key) === value),
      );
      return expectAuthorized(req, 'GET');
    }

    async function openList(tasks: ApiTask[]): Promise<void> {
      await harness.navigateByUrl(`/projects/${CAPSTONE.id}/tasks`);
      await settle();
      http.expectOne(LABELS_API).flush(LABELS);
      http.expectOne(`${PROJECTS_API}/${CAPSTONE.id}`).flush(CAPSTONE);
      expectTaskList().flush(tasks);
      await settle();
    }

    const TASKS = [
      apiTask(31, 'Fix login bug', URGENT),
      apiTask(32, 'Write notes', NORMAL),
      apiTask(33, 'Read a book', SOMEDAY),
    ];

    // FE-LPM-05
    it('filters by the user’s own levels, in order, and colors each task by its level', async () => {
      await startSignedIn();
      await openList(TASKS);

      const filter = [...el<HTMLSelectElement>('#filter-priority').options];
      expect(filter.map((o) => [clean(o.textContent), o.value])).toEqual([
        ['All priorities', ''],
        ['Urgent', 'urgent'],
        ['Normal', 'normal'],
        ['Someday', 'someday'],
      ]);
      const badges = all('app-task-item .priority');
      expect(badges.map((b) => clean(b.textContent))).toEqual(['Urgent', 'Normal', 'Someday']);
      expect(badges.map((b) => b.style.getPropertyValue('--priority-color'))).toEqual([
        '#B91C1C',
        '#F59E0B',
        '#94A3B8',
      ]);

      choose('#filter-priority', 'urgent');
      await settle();
      // Custom level names go in the Sprint 5 `priorities` parameter.
      expectTaskList({ priorities: 'urgent' }).flush([TASKS[0]]);
      await settle();
      expect(all('app-task-item .title').map((t) => clean(t.textContent))).toEqual([
        'Fix login bug',
      ]);
    });

    // FE-LPM-02, FE-LPM-05
    it('offers the levels in order in the task form and preselects the default for a new task', async () => {
      await startSignedIn();
      await openList([]);

      await press(el('app-task-list button.new'));
      http
        .match((r) => r.url === PROJECTS_API)
        .forEach((r) =>
          r.flush(r.request.params.get('isArchived') === 'true' ? [] : [INBOX, CAPSTONE]),
        );
      http.match(LABELS_API).forEach((r) => r.flush(LABELS));
      await settle();

      const picker = el<HTMLSelectElement>('#task-priority');
      expect([...picker.options].map((o) => clean(o.textContent))).toEqual([
        'Urgent',
        'Normal',
        'Someday',
      ]);
      expect(clean(picker.selectedOptions[0]?.textContent)).toBe('Normal');

      type('#task-title', 'Plan sprint');
      await submit('app-task-form');
      const create = expectAuthorized(http.expectOne(TASKS_API), 'POST');
      // With the user's own levels loaded, the form names the level by id.
      expect(create.request.body).toEqual(
        expect.objectContaining({ title: 'Plan sprint', priorityId: NORMAL.id }),
      );
      expect(create.request.body).not.toHaveProperty('priority');
      create.flush(apiTask(34, 'Plan sprint', NORMAL), status(201, 'Created'));
      await settle();

      expect(clean(el('app-task-item .priority').textContent)).toBe('Normal');
    });
  });

  // Case 5
  describe('Failures', () => {
    // FE-LPM-06
    it('shows Try again when the labels or priorities fail to load with 500', async () => {
      await startSignedIn();

      await harness.navigateByUrl('/settings/labels');
      await settle();
      expectLabelList(false).flush({ error: 'Internal server error' }, status(500));
      dropArchivedLabelRequest();
      await settle();
      expect(text('app-label-settings [role="alert"]')).toBe(
        "Couldn't load your labels. Try again",
      );
      await press(
        all('app-label-settings [role="alert"] button').find(
          (b) => clean(b.textContent) === 'Try again',
        )!,
      );
      expectLabelList(false).flush(LABELS);
      expectLabelList(true).flush([]);
      await settle();
      expect(el('app-label-settings [role="alert"]')).toBeNull();
      expect(rows('Labels')).toHaveLength(3);

      await harness.navigateByUrl('/settings/priorities');
      await settle();
      http.expectOne(PRIORITIES_API).flush({ error: 'Internal server error' }, status(500));
      await settle();
      // A failed refresh keeps the levels loaded at sign-in, still editable, without an alert.
      // The retry for priorities is in the next test, where nothing has loaded yet.
      expect(el('app-priority-settings [role="alert"]')).toBeNull();
      expect(el('#new-priority-name')).toBeTruthy();
      expect(rows('Priority levels')).toEqual([
        'Urgent (2 tasks)',
        'Normal [Default] (5 tasks)',
        'Someday (0 tasks)',
      ]);
    });

    // FE-LPM-06
    it('shows the built-in levels with Try again when priorities fail before any load', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
      http = TestBed.inject(HttpTestingController);
      router = TestBed.inject(Router);
      harness = await RouterTestingHarness.create();
      http.expectOne(`${AUTH_API}/me`).flush(USER);
      await settle();
      http.expectOne(PRIORITIES_API).flush({ error: 'Internal server error' }, status(500));
      http.match(SETTINGS_API).forEach((req) => req.flush(SETTINGS));
      await settle();

      await harness.navigateByUrl('/settings/priorities');
      await settle();
      http.expectOne(PRIORITIES_API).flush({ error: 'Internal server error' }, status(500));
      await settle();

      expect(text('app-priority-settings [role="alert"]')).toBe(
        "Couldn't load your priority levels. The built-in High, Medium and Low levels are shown until they load. Try again",
      );
      expect(rows('Priority levels')).toEqual(['High', 'Medium [Default]', 'Low']);
      expect(el('#priority-1-delete')).toBeNull();

      await press(
        all('app-priority-settings [role="alert"] button').find(
          (b) => clean(b.textContent) === 'Try again',
        )!,
      );
      answerPriorities();
      await settle();
      expect(el('app-priority-settings [role="alert"]')).toBeNull();
      expect(rows('Priority levels')[1]).toBe('Normal [Default] (5 tasks)');
    });

    // FE-LPM-06
    it('sends the user to /login when a request returns 401', async () => {
      await startSignedIn();

      await harness.navigateByUrl('/settings/labels');
      await settle();
      expectLabelList(false).flush({ error: 'Unauthorized' }, status(401, 'Unauthorized'));
      dropArchivedLabelRequest();
      await settle();

      expect(router.url).toBe('/login');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });
});
