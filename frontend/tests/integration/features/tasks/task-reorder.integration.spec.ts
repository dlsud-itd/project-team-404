import { CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop';
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
import type { ApiTask } from '../../../../src/app/features/tasks/shared/types/task.types';
import { environment } from '../../../../src/environments/environment';

/**
 * Drag & Drop Reordering frontend integration tests (Sprint 6: FE-DND-01 to FE-DND-04).
 *
 * The app runs through its real /projects/:projectId/tasks route behind authGuard: the task list
 * with its CDK drop list, Move up/down buttons and Alt+Arrow keys, TaskService, TasksStore and
 * authInterceptor; and through /projects/organize for the project switcher's drop list and
 * ProjectOrganizationService. Drags go through the drop lists' real `dropped` handlers, as a
 * finished CDK drag does. Only the network is faked, with the bodies and status codes of
 * PUT /api/tasks/reorder (task-organization.controller.ts: `{ projectId, taskIds }`, the
 * validate-request 400 and the reorder-conflict 409), PUT /api/projects/reorder
 * (project-organization.controller.ts), require-auth's 401 and the error handler's 500.
 */

const AUTH_API = `${environment.apiBaseUrl}/api/auth`;
const PROJECTS_API = `${environment.apiBaseUrl}/api/projects`;
const LABELS_API = `${environment.apiBaseUrl}/api/labels`;
const TASKS_API = `${environment.apiBaseUrl}/api/tasks`;
const REORDER_API = `${TASKS_API}/reorder`;
const TOKEN = 'session-token';

const USER = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 1,
};

const CAPSTONE = {
  id: 10,
  name: 'Capstone',
  description: null,
  color: null,
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 1,
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
};

function apiTask(id: number, title: string, overrides: Partial<ApiTask> = {}): ApiTask {
  return {
    id,
    projectId: CAPSTONE.id,
    position: id,
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

// In position order, as GET /api/tasks?orderBy=position sends them: open tasks, then done ones.
const OUTLINE = apiTask(5, 'Outline');
const DRAFT = apiTask(6, 'Draft');
const REVIEW = apiTask(7, 'Review');
const PROPOSAL = apiTask(8, 'Proposal', { isDone: true, doneAt: '2026-11-10T00:00:00.000Z' });
const TASKS = [OUTLINE, DRAFT, REVIEW, PROPOSAL];

// Error bodies from validate-request.middleware.ts, task-reorder-conflict.error.ts,
// require-auth.middleware.ts and error-handler.middleware.ts.
const INVALID_ORDER = {
  error: 'Invalid task order',
  details: [{ field: 'taskIds', message: 'Task IDs must be unique' }],
};
const ORDER_CONFLICT = { error: 'Task list changed; reload before reordering' };
const SERVER_ERROR = { error: 'Internal server error' };
const TOKEN_REJECTED = { error: 'Token invalid or expired' };

const status = (code: number, statusText = 'Error') => ({ status: code, statusText });

describe('Task reorder integration (Drag & Drop Reordering + API)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const page = () => harness.fixture.nativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';
  const openTitles = () =>
    all('[aria-labelledby="open-heading"] app-task-item .title').map((n) => n.textContent?.trim());
  const doneTitles = () =>
    all('[aria-labelledby="completed-heading"] app-task-item .title').map((n) =>
      n.textContent?.trim(),
    );
  const moveButton = (title: string, direction: 'up' | 'down') =>
    el<HTMLButtonElement>(`button[aria-label="Move ${title} ${direction}"]`);

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function startSignedIn(): Promise<void> {
    localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    http.expectOne(`${AUTH_API}/me`).flush(USER);
  }

  function expectTaskList(): TestRequest {
    return http.expectOne(
      (r) =>
        r.method === 'GET' && r.url === TASKS_API && r.params.get('projectId') === `${CAPSTONE.id}`,
    );
  }

  /** Opens the project's list (optionally with filters in the URL) and answers its requests. */
  async function openList(tasks: ApiTask[] = TASKS, query = ''): Promise<TestRequest> {
    await harness.navigateByUrl(`/projects/${CAPSTONE.id}/tasks${query}`);
    await settle();
    http.expectOne(LABELS_API).flush([]);
    http.expectOne(`${PROJECTS_API}/${CAPSTONE.id}`).flush(CAPSTONE);
    const req = expectTaskList();
    req.flush(tasks);
    await settle();
    return req;
  }

  /** Drops through the list's real CDK handler, as a finished drag does. */
  async function drop(previousIndex: number, currentIndex: number): Promise<void> {
    const list = harness
      .routeDebugElement!.query(By.directive(CdkDropList))
      .injector.get(CdkDropList);
    list.dropped.emit({ previousIndex, currentIndex } as CdkDragDrop<unknown>);
    await settle();
  }

  function expectReorder(taskIds: number[]): TestRequest {
    const req = http.expectOne(REORDER_API);
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    expect(req.request.body).toEqual({ projectId: CAPSTONE.id, taskIds });
    return req;
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
    try {
      // Opening a project stamps it for the dashboard's "Recently accessed" sort.
      http?.match((r) => r.url.endsWith('/access'));
      if (http) http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  it('loads a project in its own order when no sort is picked', async () => {
    await startSignedIn();
    const req = await openList();

    expect(req.request.params.get('orderBy')).toBe('position');
    expect(req.request.params.get('orderDirection')).toBe('asc');
    expect(openTitles()).toEqual(['Outline', 'Draft', 'Review']);
    expect(all('[aria-labelledby="open-heading"] .handle')).toHaveLength(3);
    expect(el('.reorder-hint')).toBeNull();
  });

  // FE-DND-01
  it('drags the last task to the top: shows the order at once and sends every open id', async () => {
    await startSignedIn();
    await openList();

    await drop(2, 0);

    expect(openTitles()).toEqual(['Review', 'Outline', 'Draft']);
    const req = expectReorder([7, 5, 6]);
    req.flush({ projectId: CAPSTONE.id, taskIds: [7, 5, 6] });
    await settle();

    expect(openTitles()).toEqual(['Review', 'Outline', 'Draft']);
    // Completed tasks are not part of the order.
    expect(doneTitles()).toEqual(['Proposal']);
    expect(el('.banner-error')).toBeNull();
  });

  it('sends nothing when a task is dropped where it was', async () => {
    await startSignedIn();
    await openList();

    await drop(1, 1);

    http.expectNone(REORDER_API);
    expect(openTitles()).toEqual(['Outline', 'Draft', 'Review']);
  });

  // FE-DND-02
  it('moves a task with the Move buttons, sending the same request and keeping focus', async () => {
    await startSignedIn();
    await openList();

    expect(moveButton('Outline', 'up').disabled).toBe(true);
    expect(moveButton('Review', 'down').disabled).toBe(true);

    moveButton('Outline', 'down').focus();
    moveButton('Outline', 'down').click();
    await settle();

    expect(openTitles()).toEqual(['Draft', 'Outline', 'Review']);
    expectReorder([6, 5, 7]).flush({ projectId: CAPSTONE.id, taskIds: [6, 5, 7] });
    await settle();
    expect(document.activeElement).toBe(moveButton('Outline', 'down'));

    // Moving it to the end disables its Down button, so focus goes to Up instead.
    moveButton('Outline', 'down').click();
    await settle();
    expectReorder([6, 7, 5]).flush({ projectId: CAPSTONE.id, taskIds: [6, 7, 5] });
    await settle();
    expect(openTitles()).toEqual(['Draft', 'Review', 'Outline']);
    expect(document.activeElement).toBe(moveButton('Outline', 'up'));
  });

  // FE-DND-02
  it('moves a task with Alt+Up and Alt+Down from anywhere in its row, sending the same request', async () => {
    await startSignedIn();
    await openList();
    const row = (title: string) =>
      all('[aria-labelledby="open-heading"] li.item').find((item) =>
        item.querySelector('.title')?.textContent?.includes(title),
      )!;
    const press = async (title: string, key: 'ArrowUp' | 'ArrowDown') => {
      // From the row's Edit link, as a keyboard user would be.
      const edit = row(title).querySelector<HTMLElement>('a.edit')!;
      edit.focus();
      const event = new KeyboardEvent('keydown', {
        key,
        altKey: true,
        bubbles: true,
        cancelable: true,
      });
      edit.dispatchEvent(event);
      await settle();
      return event;
    };
    expect(row('Draft').getAttribute('aria-keyshortcuts')).toBe('Alt+ArrowUp Alt+ArrowDown');

    const up = await press('Review', 'ArrowUp');
    expect(up.defaultPrevented).toBe(true);
    expect(openTitles()).toEqual(['Outline', 'Review', 'Draft']);
    expectReorder([5, 7, 6]).flush({ projectId: CAPSTONE.id, taskIds: [5, 7, 6] });
    await settle();
    expect(document.activeElement).toBe(moveButton('Review', 'up'));

    await press('Outline', 'ArrowDown');
    expectReorder([7, 5, 6]).flush({ projectId: CAPSTONE.id, taskIds: [7, 5, 6] });
    await settle();
    expect(openTitles()).toEqual(['Review', 'Outline', 'Draft']);

    // Nothing happens at the ends, or without Alt.
    const top = await press('Review', 'ArrowUp');
    expect(top.defaultPrevented).toBe(false);
    row('Draft')
      .querySelector<HTMLElement>('a.edit')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await settle();
    http.expectNone(REORDER_API);
    expect(openTitles()).toEqual(['Review', 'Outline', 'Draft']);
  });

  it('clears the session and opens /login on a 401', async () => {
    await startSignedIn();
    await openList();

    await drop(2, 0);
    expectReorder([7, 5, 6]).flush(TOKEN_REJECTED, status(401, 'Unauthorized'));
    await settle();

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  // FE-DND-03
  describe('a failed reorder', () => {
    it.each([
      [400, INVALID_ORDER, "Your new order wasn't saved. Invalid task order"],
      [500, SERVER_ERROR, "Your new order wasn't saved. Something went wrong. Please try again."],
    ] as const)(
      'puts the old order back with a message after a %i',
      async (code, body, message) => {
        await startSignedIn();
        await openList();

        await drop(2, 0);
        expect(openTitles()).toEqual(['Review', 'Outline', 'Draft']);
        expectReorder([7, 5, 6]).flush(body, status(code));
        await settle();

        expect(openTitles()).toEqual(['Outline', 'Draft', 'Review']);
        // A banner, not a toast: it stays until the next change, and screen readers hear it.
        expect(text('.banner-error')).toBe(message);
        expect(el('.banner-error').getAttribute('role')).toBe('alert');
        // Only a 409 reloads the list.
        http.expectNone((r) => r.method === 'GET' && r.url === TASKS_API);
      },
    );

    it('reloads the list from the server after a 409', async () => {
      await startSignedIn();
      await openList();

      await drop(2, 0);
      expectReorder([7, 5, 6]).flush(ORDER_CONFLICT, status(409, 'Conflict'));
      await settle();

      expect(openTitles()).toEqual(['Outline', 'Draft', 'Review']);
      expect(text('.banner-error')).toContain('this list changed somewhere else');

      // Someone added a task elsewhere; the reloaded list shows it.
      const extra = apiTask(9, 'Slides');
      expectTaskList().flush([OUTLINE, DRAFT, REVIEW, extra, PROPOSAL]);
      await settle();
      expect(openTitles()).toEqual(['Outline', 'Draft', 'Review', 'Slides']);
    });
  });

  // FE-DND-04
  describe('when the whole list is not shown', () => {
    async function expectBlocked(hint: string): Promise<void> {
      expect(text('.reorder-hint')).toBe(hint);
      expect(all('[aria-labelledby="open-heading"] .handle')).toHaveLength(0);
      const buttons = all('[aria-labelledby="open-heading"] .move button') as HTMLButtonElement[];
      expect(buttons.length).toBeGreaterThan(0);
      expect(buttons.every((button) => button.disabled)).toBe(true);
      expect(buttons[0].getAttribute('aria-describedby')).toBe('reorder-hint');

      await drop(1, 0);
      const row = all('[aria-labelledby="open-heading"] li.item')[1];
      expect(row.getAttribute('aria-keyshortcuts')).toBeNull();
      row.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }),
      );
      await settle();
      http.expectNone(REORDER_API);
    }

    it('is off while a filter is applied', async () => {
      await startSignedIn();
      await openList([OUTLINE, DRAFT], '?priorities=low');

      await expectBlocked('Clear the filters to reorder tasks.');
    });

    it('is off while the list is sorted by another field', async () => {
      await startSignedIn();
      const req = await openList(TASKS, '?orderBy=title');
      expect(req.request.params.get('orderBy')).toBe('title');

      await expectBlocked('Switch the sort to Default order to reorder tasks.');
    });

    it('is off when the project has more open tasks than one page holds', async () => {
      await startSignedIn();
      const many = Array.from({ length: 100 }, (_, i) => apiTask(100 + i, `Task ${i + 1}`));
      await openList(many);

      await expectBlocked('This project has too many open tasks to reorder here.');
    });
  });

  // Projects use the Sprint 2 reorder request.
  it('drags a project on the Projects page and sends PUT /projects/reorder with every id', async () => {
    const project = (id: number, name: string, overrides: object = {}) => ({
      ...CAPSTONE,
      id,
      name,
      sortOrder: id,
      ...overrides,
    });
    const INBOX = project(1, 'Inbox', { isInbox: true, sortOrder: 0 });
    const GYM = project(12, 'Gym', { isFavorite: true, sortOrder: 0 });
    const THESIS = project(11, 'Thesis', { sortOrder: 2 });
    const OLD = project(13, 'Old class', { isArchived: true, sortOrder: 3 });

    await startSignedIn();
    // The old Organize address now opens the single Projects page, where dragging lives.
    await harness.navigateByUrl('/projects/organize');
    await settle();
    expect(TestBed.inject(Router).url).toBe('/home?tab=projects');
    http.expectOne(`${PROJECTS_API}?isArchived=false`).flush([INBOX, GYM, CAPSTONE, THESIS]);
    http.expectOne(`${PROJECTS_API}?isArchived=true`).flush([OLD]);
    await settle();
    const active = () =>
      all('section[aria-labelledby="projects-heading"] .item .tasks-link').map((n) =>
        n.textContent?.trim(),
      );
    expect(active()).toEqual(['Capstone', 'Thesis']);

    const lists = harness.routeDebugElement!.queryAll(By.directive(CdkDropList));
    lists[1].injector
      .get(CdkDropList)
      .dropped.emit({ previousIndex: 1, currentIndex: 0 } as CdkDragDrop<unknown>);
    await settle();

    expect(active()).toEqual(['Thesis', 'Capstone']);
    const req = http.expectOne(`${PROJECTS_API}/reorder`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    // Favorites, then my projects, then archived; never the Inbox.
    expect(req.request.body).toEqual({ projectIds: [12, 11, 10, 13] });
    req.flush({
      projects: [
        { projectId: 12, sortOrder: 0 },
        { projectId: 11, sortOrder: 1 },
        { projectId: 10, sortOrder: 2 },
        { projectId: 13, sortOrder: 3 },
      ],
      message: 'Project order updated successfully',
    });
    await settle();
    expect(active()).toEqual(['Thesis', 'Capstone']);
  });
});
