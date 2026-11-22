import { CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  type TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
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
 * with its CDK drop list and Move up/down buttons, TaskService, TasksStore and authInterceptor.
 * Drags go through the drop list's real `dropped` handler, as a finished CDK drag does. Only the
 * network is faked, with the bodies and status codes of PUT /api/tasks/reorder in
 * backend/src/features/tasks/task-organization.
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

  // FE-DND-03
  describe('a failed reorder', () => {
    it.each([
      [400, 'Invalid task order'],
      [500, 'Something went wrong'],
    ])('puts the old order back with a message after a %i', async (code, error) => {
      await startSignedIn();
      await openList();

      await drop(2, 0);
      expectReorder([7, 5, 6]).flush({ error }, status(code));
      await settle();

      expect(openTitles()).toEqual(['Outline', 'Draft', 'Review']);
      expect(text('.banner-error')).toContain("Your new order wasn't saved.");
      // Only a 409 reloads the list.
      http.expectNone((r) => r.method === 'GET' && r.url === TASKS_API);
    });

    it('reloads the list from the server after a 409', async () => {
      await startSignedIn();
      await openList();

      await drop(2, 0);
      expectReorder([7, 5, 6]).flush({ error: 'Task order changed' }, status(409, 'Conflict'));
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
});
