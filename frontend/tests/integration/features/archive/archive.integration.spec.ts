import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  type TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../../src/app/app.routes';
import { provideSessionRestore } from '../../../../src/app/features/auth/session/auth.guards';
import { authInterceptor } from '../../../../src/app/features/auth/session/auth.interceptor';
import { TOKEN_STORAGE_KEY } from '../../../../src/app/features/auth/session/token-storage.service';
import type { ApiTask } from '../../../../src/app/features/tasks/shared/types/task.types';
import { ToastOutlet } from '../../../../src/app/shared/components/toast-outlet/toast-outlet';
import { environment } from '../../../../src/environments/environment';

/**
 * Archive frontend integration tests (Sprint 5: FE-ARC rows).
 *
 * The app runs through its real routes behind authGuard: the project task list with its Archive
 * actions, the task edit page (read-only when archived, with the label picker), the project
 * switcher and the /archive page, with the real ArchiveService, ArchiveUndoService, TaskService,
 * LabelService, ProjectService, the stores, ToastService and authInterceptor. ToastOutlet sits in
 * the root App component, outside the routed pages, so it is rendered next to the harness.
 *
 * Only the network is faked. Bodies follow the backend: toTaskModel, toProjectModel and
 * toLabelModel (with isArchived and archivedAt), GET /api/archive from archive.service.ts
 * ({ tasks, projects, labels } groups with totals and nextCursor), the 409 bodies of
 * task-organization.controller.ts, require-auth's 401 and the error handler's 500.
 */

const API = `${environment.apiBaseUrl}/api`;
const AUTH_API = `${API}/auth`;
const TASKS_API = `${API}/tasks`;
const PROJECTS_API = `${API}/projects`;
const LABELS_API = `${API}/labels`;
const ARCHIVE_API = `${API}/archive`;
const TOKEN = 'session-token';

const USER = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 1,
};

const STAMPS = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' };
/** Recent enough that the Archive page says "Archived 5 minutes ago" on any day. */
const FIVE_MINUTES_AGO = () => new Date(Date.now() - 5 * 60_000).toISOString();

/** A project as toProjectModel sends it. */
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
const OLD_CLASS = apiProject(12, 'Old class', {
  isArchived: true,
  archivedAt: '2026-11-20T00:00:00.000Z',
});

/** A label as toLabelModel sends it. */
function apiLabel(id: number, name: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name,
    color: '#7C3AED',
    sortOrder: id,
    isArchived: false,
    archivedAt: null,
    ...STAMPS,
    ...overrides,
  };
}

const PLANNING = apiLabel(21, 'Planning');
const FOLLOW_UP = apiLabel(22, 'Follow-up');
const IDEAS = apiLabel(23, 'Ideas', { isArchived: true, archivedAt: '2026-11-19T00:00:00.000Z' });
/** GET /api/labels: active labels only (isArchived defaults to false). */
const ACTIVE_LABELS = [PLANNING, FOLLOW_UP];

/** A label as it appears on a task in toTaskModel. */
function taskLabel(label: ReturnType<typeof apiLabel>) {
  return {
    id: label.id,
    name: label.name,
    color: label.color,
    isArchived: label.isArchived,
    archivedAt: label.archivedAt,
  };
}

/** A task as toTaskModel sends it. */
function apiTask(id: number, title: string, overrides: Partial<ApiTask> = {}): ApiTask {
  return {
    id,
    projectId: CAPSTONE.id,
    position: id,
    title,
    description: null,
    priority: 'medium',
    scheduledDate: null,
    dueDate: null,
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

const REPORT = apiTask(31, 'Write report', { labels: [taskLabel(PLANNING)] });
// Carries a label that was archived after it was attached.
const SLIDES = apiTask(32, 'Make slides', { labels: [taskLabel(PLANNING), taskLabel(IDEAS)] });
const NOTES = apiTask(33, 'Read notes');

function archived<T extends object>(item: T, archivedAt = FIVE_MINUTES_AGO()): T {
  return { ...item, isArchived: true, archivedAt };
}

/** GET /api/archive as archive.service.ts builds it. */
function archiveBody({
  tasks = [] as ApiTask[],
  projects = [] as object[],
  labels = [] as object[],
  totals = {} as Partial<Record<'tasks' | 'projects' | 'labels', number>>,
  nextCursor = null as string | null,
} = {}) {
  return {
    tasks: { items: tasks, total: totals.tasks ?? tasks.length },
    projects: { items: projects, total: totals.projects ?? projects.length },
    labels: { items: labels, total: totals.labels ?? labels.length },
    nextCursor,
  };
}

// Error bodies from task-organization.controller.ts, require-auth and error-handler.middleware.ts.
const LABEL_ARCHIVED = { error: 'Archived labels cannot be attached to a task' };
const TOKEN_REJECTED = { error: 'Token invalid or expired' };
const SERVER_ERROR = { error: 'Internal server error' };

const status = (code: number, statusText = 'Error') => ({ status: code, statusText });

describe('Archive integration (task list, task form, project switcher, Archive page + API)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;
  let toastFixture: ComponentFixture<ToastOutlet>;

  const page = () => harness.fixture.nativeElement as HTMLElement;
  const clean = (value: string | null | undefined) => value?.trim().replace(/\s+/g, ' ') ?? '';
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const text = (selector: string) => clean(el(selector)?.textContent);
  const byLabel = <T extends HTMLElement = HTMLButtonElement>(label: string) =>
    el<T>(`[aria-label="${label}"]`);
  const titles = () => all('app-task-item .title').map((t) => clean(t.textContent));
  const toasts = () =>
    [...(toastFixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.toast')].map(
      (toast) => ({
        message: clean(toast.querySelector('.message')?.textContent),
        role: toast.getAttribute('role'),
        action: toast.querySelector<HTMLButtonElement>('button.action'),
      }),
    );

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
    toastFixture.detectChanges();
  }

  /** Ticks a checkbox the way the browser reports it; jsdom's click() sends no change here. */
  async function check(box: HTMLInputElement): Promise<void> {
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    await settle();
  }

  async function press(target: HTMLElement | null | undefined): Promise<void> {
    expect(target, 'element to press').toBeTruthy();
    target!.click();
    await settle();
  }

  function expectAuthorized(req: TestRequest, method: string): TestRequest {
    expect(req.request.method).toBe(method);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    return req;
  }

  /** Signs in the way a page load does: a stored token that GET /api/auth/me accepts. */
  async function startSignedIn(): Promise<void> {
    localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    toastFixture = TestBed.createComponent(ToastOutlet);
    http.expectOne(`${AUTH_API}/me`).flush(USER);
    await settle();
  }

  /** Answers GET /api/projects (active and archived), whichever pages asked for them. */
  function answerProjects(active = [INBOX, CAPSTONE], archivedProjects = [OLD_CLASS]): void {
    http
      .match((r) => r.method === 'GET' && r.url === PROJECTS_API)
      .forEach((req) =>
        req.flush(req.request.params.get('isArchived') === 'true' ? archivedProjects : active),
      );
  }

  /** Opens Capstone's task list and answers its requests. */
  async function openTaskList(tasks: ApiTask[] = [REPORT, SLIDES, NOTES]): Promise<void> {
    await harness.navigateByUrl(`/projects/${CAPSTONE.id}/tasks`);
    await settle();
    http.expectOne(LABELS_API).flush(ACTIVE_LABELS);
    http.expectOne(`${PROJECTS_API}/${CAPSTONE.id}`).flush(CAPSTONE);
    http
      .expectOne((r) => r.url === TASKS_API && r.params.get('projectId') === `${CAPSTONE.id}`)
      .flush(tasks);
    await settle();
  }

  /** Opens a task's edit page and answers its requests. */
  async function openEdit(task: ApiTask): Promise<void> {
    await harness.navigateByUrl(`/projects/${CAPSTONE.id}/tasks/${task.id}/edit`);
    await settle();
    answerProjects();
    http.match(LABELS_API).forEach((req) => req.flush(ACTIVE_LABELS));
    http.expectOne(`${TASKS_API}/${task.id}`).flush(task);
    await settle();
  }

  function expectArchive(params: Record<string, string>): TestRequest {
    const req = http.expectOne(
      (r) =>
        r.method === 'GET' &&
        r.url === ARCHIVE_API &&
        Object.entries(params).every(([key, value]) => r.params.get(key) === value) &&
        r.params.keys().length === Object.keys(params).length,
    );
    return expectAuthorized(req, 'GET');
  }

  /** Opens /archive, answers the project lists and returns the first GET /api/archive. */
  async function openArchive(url = '/archive'): Promise<TestRequest> {
    await harness.navigateByUrl(url);
    await settle();
    answerProjects();
    return expectArchive({ type: 'all', limit: '20' });
  }

  function expectArchivePut(path: string, isArchived: boolean): TestRequest {
    const req = expectAuthorized(http.expectOne(`${API}/${path}/archive`), 'PUT');
    expect(req.request.body).toEqual({ isArchived });
    return req;
  }

  const rowNames = () => all('app-archive-page li.row .title').map((t) => clean(t.textContent));
  const tab = (name: string) =>
    all('app-archive-page [role="tab"]').find(
      (t) => clean(t.querySelector('span')?.textContent) === name,
    )!;
  const tabCount = (name: string) => clean(tab(name)?.querySelector('.count')?.textContent);

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

  // Case 1
  describe('Archiving a task from the task list', () => {
    // FE-ARC-01
    it('removes the task at once, shows an Undo toast, and Undo sends the restore', async () => {
      await startSignedIn();
      await openTaskList();
      expect(titles()).toEqual(['Write report', 'Make slides', 'Read notes']);

      await press(byLabel('Archive task Write report'));
      // Optimistic: gone before the server answers.
      expect(titles()).toEqual(['Make slides', 'Read notes']);
      expectArchivePut(`tasks/${REPORT.id}`, true).flush(archived(REPORT));
      await settle();

      expect(titles()).toEqual(['Make slides', 'Read notes']);
      const [toast] = toasts();
      expect(toast.message).toBe('Task “Write report” archived');
      expect(toast.role).toBe('status');
      expect(clean(toast.action?.textContent)).toBe('Undo');

      await press(toast.action);
      // Undo puts it straight back and sends the restore.
      expect(titles()).toEqual(['Write report', 'Make slides', 'Read notes']);
      expect(toasts()).toEqual([]);
      expectArchivePut(`tasks/${REPORT.id}`, false).flush(REPORT);
      await settle();
      expect(titles()).toEqual(['Write report', 'Make slides', 'Read notes']);
      // An Undo just brings the task back; it does not announce a restore.
      expect(toasts()).toEqual([]);
    });
  });

  // Case 2
  describe('A failed archive', () => {
    // FE-ARC-05
    it('puts the task back and shows an error toast', async () => {
      await startSignedIn();
      await openTaskList();

      await press(byLabel('Archive task Make slides'));
      expect(titles()).toEqual(['Write report', 'Read notes']);
      expectArchivePut(`tasks/${SLIDES.id}`, true).flush(
        SERVER_ERROR,
        status(500, 'Internal Server Error'),
      );
      await settle();

      expect(titles()).toEqual(['Write report', 'Make slides', 'Read notes']);
      expect(toasts()).toEqual([
        {
          message: "Couldn't archive task “Make slides”. Please try again.",
          role: 'alert',
          action: null,
        },
      ]);
    });
  });

  // Case 3
  describe('The Archive page', () => {
    const ARCHIVED_REPORT = archived(REPORT);
    const ARCHIVED_OLD_CLASS = {
      ...OLD_CLASS,
      archivedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
    };
    const ARCHIVED_IDEAS = {
      ...IDEAS,
      archivedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
      taskCount: 1,
    };

    // FE-ARC-03
    it('loads every type grouped with counts, sends the type for each tab and the cursor for Load more', async () => {
      await startSignedIn();
      (await openArchive()).flush(
        archiveBody({
          tasks: [ARCHIVED_REPORT],
          projects: [ARCHIVED_OLD_CLASS],
          labels: [ARCHIVED_IDEAS],
          totals: { tasks: 3, projects: 1, labels: 1 },
          nextCursor: 'cursor-page-2',
        }),
      );
      await settle();

      expect(text('app-archive-page h1')).toBe('Archive');
      expect(rowNames()).toEqual(['Write report', 'Old class', 'Ideas']);
      expect(all('app-archive-page li.row').map((row) => row.dataset['kind'])).toEqual([
        'task',
        'project',
        'label',
      ]);
      expect([
        tabCount('All'),
        tabCount('Tasks'),
        tabCount('Projects'),
        tabCount('Labels'),
      ]).toEqual(['5', '3', '1', '1']);
      const [taskRow, , labelRow] = all('app-archive-page li.row');
      const meta = (row: HTMLElement) =>
        [...row.querySelectorAll(':scope .meta > span')].map((span) => clean(span.textContent));
      expect(meta(taskRow)).toEqual(['Task', 'Capstone', 'Archived 5 minutes ago']);
      expect(meta(labelRow)).toEqual(['Label', '1 task', 'Archived 20 minutes ago']);

      // Load more sends the cursor and appends the next page.
      const older = archived(NOTES, new Date(Date.now() - 60 * 60_000).toISOString());
      await press(
        all('app-archive-page .more button').find((b) => clean(b.textContent) === 'Load more'),
      );
      expectArchive({ type: 'all', limit: '20', cursor: 'cursor-page-2' }).flush(
        archiveBody({ tasks: [older], totals: { tasks: 3, projects: 1, labels: 1 } }),
      );
      await settle();
      expect(rowNames()).toEqual(['Write report', 'Old class', 'Ideas', 'Read notes']);
      expect(el('app-archive-page .more')).toBeNull();

      // Each tab asks for its own type, and keeps the counts it already knows.
      for (const [name, type, body] of [
        ['Tasks', 'tasks', archiveBody({ tasks: [ARCHIVED_REPORT], totals: { tasks: 3 } })],
        ['Projects', 'projects', archiveBody({ projects: [ARCHIVED_OLD_CLASS] })],
        ['Labels', 'labels', archiveBody({ labels: [ARCHIVED_IDEAS] })],
      ] as const) {
        await press(tab(name));
        expectArchive({ type, limit: '20' }).flush(body);
        await settle();
        expect(router.url).toBe(`/archive?tab=${type}`);
        expect(tab(name).getAttribute('aria-selected')).toBe('true');
        expect(tabCount('All')).toBe('5');
      }
      expect(rowNames()).toEqual(['Ideas']);
    });

    // FE-ARC-01, FE-ARC-02
    it('restores a task: the row goes and the task is back in its list', async () => {
      await startSignedIn();
      (await openArchive()).flush(
        archiveBody({ tasks: [ARCHIVED_REPORT], projects: [ARCHIVED_OLD_CLASS] }),
      );
      await settle();

      await press(byLabel('Restore task Write report'));
      expect(rowNames()).toEqual(['Old class']);
      expect(tabCount('Tasks')).toBe('0');
      expect(tabCount('All')).toBe('1');
      expectArchivePut(`tasks/${REPORT.id}`, false).flush(REPORT);
      await settle();
      expect(toasts().map((t) => t.message)).toEqual(['Task “Write report” restored']);

      await openTaskList([REPORT, SLIDES, NOTES]);
      expect(titles()).toContain('Write report');
    });

    // FE-ARC-02
    it('restores a project: the row goes and the project is back among active projects', async () => {
      await startSignedIn();
      (await openArchive()).flush(archiveBody({ projects: [ARCHIVED_OLD_CLASS] }));
      await settle();

      await press(byLabel('Restore project Old class'));
      expect(rowNames()).toEqual([]);
      expectArchivePut(`projects/${OLD_CLASS.id}`, false).flush({
        projectId: OLD_CLASS.id,
        isArchived: false,
        message: 'Project restored from archive',
      });
      await settle();
      expect(toasts().map((t) => t.message)).toEqual(['Project “Old class” restored']);
      expect(text('app-archive-page .empty-title')).toBe('Nothing archived yet');

      await harness.navigateByUrl('/projects/organize');
      await settle();
      answerProjects([INBOX, CAPSTONE, { ...OLD_CLASS, isArchived: false, archivedAt: null }], []);
      await settle();
      const active = all('section[aria-labelledby="switcher-projects-heading"] .item .name').map(
        (n) => clean(n.textContent),
      );
      expect(active).toContain('Old class');
    });

    // FE-ARC-05
    it('puts the row back and shows an error toast when a restore fails', async () => {
      await startSignedIn();
      (await openArchive()).flush(
        archiveBody({ tasks: [ARCHIVED_REPORT], projects: [ARCHIVED_OLD_CLASS] }),
      );
      await settle();

      await press(byLabel('Restore task Write report'));
      expect(rowNames()).toEqual(['Old class']);
      expectArchivePut(`tasks/${REPORT.id}`, false).flush(
        SERVER_ERROR,
        status(500, 'Internal Server Error'),
      );
      await settle();

      expect(rowNames()).toEqual(['Write report', 'Old class']);
      expect(tabCount('Tasks')).toBe('1');
      expect(toasts()).toEqual([
        {
          message: "Couldn't restore task “Write report”. Please try again.",
          role: 'alert',
          action: null,
        },
      ]);
    });

    // FE-ARC-03
    it('asks before deleting permanently and sends nothing until confirmed', async () => {
      await startSignedIn();
      (await openArchive()).flush(
        archiveBody({ tasks: [ARCHIVED_REPORT], labels: [ARCHIVED_IDEAS] }),
      );
      await settle();

      await press(byLabel('Delete label Ideas permanently'));
      const dialog = () => el('app-confirm-dialog [role="alertdialog"]');
      expect(text('#confirm-dialog-title')).toBe('Delete label “Ideas” permanently?');
      expect(text('#confirm-dialog-message')).toBe(
        "It will be removed from 1 task. This can't be undone.",
      );
      // Nothing is sent while the question is open.
      http.expectNone((r) => r.method === 'DELETE');

      await press(all('app-confirm-dialog button').find((b) => clean(b.textContent) === 'Cancel'));
      expect(dialog()).toBeNull();
      http.expectNone((r) => r.method === 'DELETE');
      expect(rowNames()).toEqual(['Write report', 'Ideas']);

      await press(byLabel('Delete task Write report permanently'));
      await press(
        all('app-confirm-dialog button').find((b) => clean(b.textContent) === 'Delete permanently'),
      );
      const req = expectAuthorized(http.expectOne(`${TASKS_API}/${REPORT.id}`), 'DELETE');
      req.flush({ message: 'Task deleted successfully' });
      await settle();

      expect(dialog()).toBeNull();
      expect(rowNames()).toEqual(['Ideas']);
      expect(toasts().map((t) => t.message)).toEqual(['Task “Write report” deleted']);
    });
  });

  // FE-ARC-02
  describe('Archiving a label', () => {
    it('moves it to Archived in Settings > Labels, and Undo restores it', async () => {
      await startSignedIn();
      await harness.navigateByUrl('/settings/labels');
      await settle();
      const list = (archivedList: boolean) =>
        expectAuthorized(
          http.expectOne(
            (r) => r.url === LABELS_API && r.params.get('isArchived') === String(archivedList),
          ),
          'GET',
        );
      list(false).flush(ACTIVE_LABELS.map((label) => ({ ...label, taskCount: 2 })));
      list(true).flush([{ ...IDEAS, taskCount: 1 }]);
      await settle();
      const activeNames = () =>
        all('ul[aria-label="Labels"] .name').map((name) => clean(name.textContent));
      const archivedNames = () =>
        all('ul[aria-labelledby="archived-labels-heading"] .name').map((name) =>
          clean(name.textContent),
        );
      expect(activeNames()).toEqual(['Planning', 'Follow-up']);
      expect(archivedNames()).toEqual(['Ideas']);

      await press(byLabel('Archive Planning'));
      expectArchivePut(`labels/${PLANNING.id}`, true).flush({
        ...archived(PLANNING),
        taskCount: 2,
      });
      await settle();
      expect(activeNames()).toEqual(['Follow-up']);
      expect(archivedNames()).toContain('Planning');
      const [toast] = toasts();
      expect(toast.message).toBe('Label “Planning” archived');

      await press(toast.action);
      expectArchivePut(`labels/${PLANNING.id}`, false).flush({ ...PLANNING, taskCount: 2 });
      await settle();
      expect(activeNames()).toEqual(['Planning', 'Follow-up']);
      expect(archivedNames()).toEqual(['Ideas']);
    });
  });

  // Case 5
  describe('An archived task', () => {
    // FE-ARC-04
    it('opens read-only with a Restore button, and Restore makes it editable', async () => {
      await startSignedIn();
      await openEdit(archived(REPORT));

      expect(text('.archived-banner p')).toBe(
        'This task is archived and read-only. Restore it to make changes.',
      );
      expect(el<HTMLInputElement>('#task-title').disabled).toBe(true);
      expect(el<HTMLTextAreaElement>('#task-description').disabled).toBe(true);
      expect(el<HTMLSelectElement>('#task-priority').disabled).toBe(true);
      expect(all('.label-option input').every((box) => (box as HTMLInputElement).disabled)).toBe(
        true,
      );
      const save = all('app-task-form button[type="submit"]')[0] as HTMLButtonElement;
      expect(save.disabled).toBe(true);
      // No Archive action on an archived task; Cancel reads Close.
      expect(byLabel('Archive task Write report')).toBeNull();
      expect(all('app-task-form .actions button').map((b) => clean(b.textContent))).toContain(
        'Close',
      );

      await press(all('.archived-banner button').find((b) => clean(b.textContent) === 'Restore'));
      expectArchivePut(`tasks/${REPORT.id}`, false).flush(REPORT);
      await settle();

      expect(el('.archived-banner')).toBeNull();
      expect(el<HTMLInputElement>('#task-title').disabled).toBe(false);
      expect(toasts().map((t) => t.message)).toEqual(['Task “Write report” restored']);
      expect(byLabel('Archive task Write report')).toBeTruthy();
    });
  });

  // Case 6
  describe('Archived labels', () => {
    // FE-ARC-04, FE-ARC-06
    it('are missing from the label picker but still shown greyed on a task that has them', async () => {
      await startSignedIn();
      await openTaskList();

      // On the list, the archived label is still shown on its task, greyed.
      const slides = all('app-task-item').find((item) =>
        item.textContent?.includes('Make slides'),
      )!;
      const chips = [...slides.querySelectorAll<HTMLElement>('.labels .label')];
      expect(chips.map((chip) => clean(chip.textContent))).toEqual(['Planning', 'Ideas']);
      expect(chips[1].classList).toContain('archived');
      expect(chips[1].title).toBe('Ideas (archived)');

      // The picker for a new task offers only active labels.
      await press(el('app-task-list button.new'));
      answerProjects();
      http.match(LABELS_API).forEach((req) => req.flush(ACTIVE_LABELS));
      await settle();
      const picker = all('[role="dialog"] .label-option').map((option) =>
        clean(option.textContent),
      );
      expect(picker).toEqual(['Planning', 'Follow-up']);
      await press(all('[role="dialog"] button').find((b) => clean(b.textContent) === 'Cancel'));
      expect(el('[role="dialog"]')).toBeNull();

      // On the task's own form: active labels to pick from, and Ideas greyed, checked and locked.
      await openEdit(SLIDES);
      const options = all('app-task-form .label-option');
      expect(options.map((option) => clean(option.textContent))).toEqual([
        'Planning',
        'Follow-up',
        'Ideas (archived)',
      ]);
      const ideas = options[2];
      expect(ideas.classList).toContain('archived');
      expect(ideas.title).toBe('Ideas is archived');
      const ideasBox = ideas.querySelector('input') as HTMLInputElement;
      expect(ideasBox.checked).toBe(true);
      expect(ideasBox.disabled).toBe(true);
      expect((options[0].querySelector('input') as HTMLInputElement).disabled).toBe(false);
    });
  });

  // Case 7
  describe('The Inbox', () => {
    // FE-ARC-02
    it('has no Archive action in the project switcher, while other projects do', async () => {
      await startSignedIn();
      await harness.navigateByUrl('/projects/organize');
      await settle();
      answerProjects();
      await settle();

      expect(text('.item.inbox .name')).toBe('Inbox');
      expect(el('.item.inbox [aria-label^="Archive"]')).toBeNull();
      expect(byLabel('Archive Inbox')).toBeNull();
      expect(byLabel('Archive Capstone')).toBeTruthy();
    });
  });

  // Case 8
  describe('Empty and error states', () => {
    // FE-ARC-03
    it('shows the empty state for an empty archive, per tab', async () => {
      await startSignedIn();
      (await openArchive()).flush(archiveBody());
      await settle();

      expect(rowNames()).toEqual([]);
      expect(text('app-archive-page .empty-title')).toBe('Nothing archived yet');
      expect(tabCount('All')).toBe('0');
      expect(el('app-archive-page .more')).toBeNull();

      await press(tab('Labels'));
      expectArchive({ type: 'labels', limit: '20' }).flush(archiveBody());
      await settle();
      expect(text('app-archive-page .empty-title')).toBe('No archived labels');
      expect(text('app-archive-page .empty-hint')).toBe(
        'Archive a label from Settings → Labels to hide it from the picker.',
      );
    });

    // FE-ARC-05
    it('shows the server message on a 409, keeping the form as it was', async () => {
      await startSignedIn();
      await openEdit(REPORT);

      // Follow-up was archived in another tab after this page loaded its labels.
      const followUp = all('app-task-form .label-option').find(
        (option) => clean(option.textContent) === 'Follow-up',
      )!;
      await check(followUp.querySelector('input')!);
      const save = all('app-task-form button[type="submit"]')[0] as HTMLButtonElement;
      expect(save.disabled).toBe(false);
      el<HTMLFormElement>('app-task-form form').dispatchEvent(new Event('submit'));
      await settle();

      const attach = expectAuthorized(http.expectOne(`${TASKS_API}/${REPORT.id}/labels`), 'POST');
      expect(attach.request.body).toEqual({ labelIds: [FOLLOW_UP.id] });
      attach.flush(LABEL_ARCHIVED, status(409, 'Conflict'));
      await settle();

      expect(text('app-task-form .form-error')).toBe(
        'Archived labels cannot be attached to a task',
      );
      expect((followUp.querySelector('input') as HTMLInputElement).checked).toBe(true);
      expect(router.url).toBe(`/projects/${CAPSTONE.id}/tasks/${REPORT.id}/edit`);
    });

    // FE-ARC-05
    it('shows Try again on a 500, which loads the archive again', async () => {
      await startSignedIn();
      (await openArchive()).flush(SERVER_ERROR, status(500, 'Internal Server Error'));
      await settle();

      expect(text('app-archive-page [role="alert"] p')).toBe("Couldn't load your archive.");
      expect(rowNames()).toEqual([]);

      await press(
        all('app-archive-page [role="alert"] button').find(
          (b) => clean(b.textContent) === 'Try again',
        ),
      );
      expectArchive({ type: 'all', limit: '20' }).flush(archiveBody({ tasks: [archived(REPORT)] }));
      await settle();
      expect(el('app-archive-page [role="alert"]')).toBeNull();
      expect(rowNames()).toEqual(['Write report']);
    });

    // FE-ARC-05
    it('clears the session and opens /login on a 401', async () => {
      await startSignedIn();
      (await openArchive()).flush(TOKEN_REJECTED, status(401, 'Unauthorized'));
      await settle();

      expect(router.url).toBe('/login');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });
});
