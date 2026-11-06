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
import type { ApiTask } from '../../../../src/app/features/tasks/shared/types/task.types';
import { environment } from '../../../../src/environments/environment';

/**
 * Task Scheduling and Task Organization frontend integration tests (Sprint 3: FE-SCH rows and the
 * priority rows of FE-ORG).
 *
 * The app runs through its real /projects/:projectId/tasks routes behind authGuard: the task list,
 * the + New task popup and the edit page with the real task form, due-date, deadline and
 * recurrence pickers and their validators, TaskService, TaskSchedulingService, TasksStore and
 * authInterceptor. The user is signed in by restoring a stored token and answering
 * GET /api/auth/me, whose timezone the form and task items use. Only the network is faked:
 * HttpTestingController answers with the status codes and bodies of
 * backend/src/features/tasks (toTaskModel, validate-request and load-owned-task middleware).
 */

const AUTH_API = `${environment.apiBaseUrl}/api/auth`;
const PROJECTS_API = `${environment.apiBaseUrl}/api/projects`;
const TASKS_API = `${environment.apiBaseUrl}/api/tasks`;
const TOKEN = 'session-token';

const USER = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 1,
};

// Projects as backend/src/features/projects sends them.
const STAMPS = { createdAt: '2026-10-20T00:00:00.000Z', updatedAt: '2026-10-20T00:00:00.000Z' };
const INBOX = {
  id: 1,
  name: 'Inbox',
  description: null,
  color: null,
  isInbox: true,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
  ...STAMPS,
};
const CAPSTONE = { ...INBOX, id: 10, name: 'Capstone', isInbox: false, sortOrder: 1 };

/** A task as toTaskModel in backend/src/features/tasks/shared/models/task.model.ts sends it. */
function apiTask(overrides: Partial<ApiTask> = {}): ApiTask {
  return {
    id: 5,
    projectId: CAPSTONE.id,
    title: 'Write report',
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

// A weekly task due Friday 20 November with a deadline that evening (Manila time).
const SCHEDULED = apiTask({
  dueDate: '2026-11-20',
  deadline: '2026-11-20T15:59:59.999Z',
  recurrence: 'weekly',
  recurrenceDays: [1, 4],
  recurrenceEndDate: '2026-12-31',
});

const status = (code: number, statusText = 'Error') => ({ status: code, statusText });

describe('Tasks integration (Task Scheduling screens + API)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.fixture.nativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  function type(selector: string, value: string): void {
    const input = el<HTMLInputElement | HTMLTextAreaElement>(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    harness.detectChanges();
  }

  function click(selector: string): void {
    el<HTMLElement>(selector).click();
    harness.detectChanges();
  }

  const RADIO_LABELS: Record<string, string> = {
    none: 'Never',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    date: 'Date',
  };

  /**
   * The radio in a group whose label reads like the value. Angular's radio directive takes
   * [value] as an input, so the input element itself carries no value to select by.
   */
  function radio(name: string, value: string): HTMLInputElement {
    return all(`input[type="radio"][name="${name}"]`).find(
      (input) => input.parentElement?.textContent?.trim() === RADIO_LABELS[value],
    ) as HTMLInputElement;
  }

  function repeat(value: 'none' | 'daily' | 'weekly' | 'monthly'): void {
    radio('task-recurrence', value).click();
    harness.detectChanges();
  }

  function endsOnDate(): void {
    radio('task-recurrence-ends', 'date').click();
    harness.detectChanges();
  }

  function toggleDay(name: string): void {
    click(`input[type="checkbox"][aria-label="${name}"]`);
  }

  function checkedDays(): string[] {
    return all('.weekdays input[type="checkbox"]')
      .filter((box) => (box as HTMLInputElement).checked)
      .map((box) => box.getAttribute('aria-label')!);
  }

  async function submit(): Promise<void> {
    el<HTMLFormElement>('app-task-form form').dispatchEvent(new Event('submit'));
    await settle();
  }

  /** Signs in the way a page load does: a stored token that GET /api/auth/me accepts. */
  async function startSignedIn(user: object = USER): Promise<void> {
    localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    http.expectOne(`${AUTH_API}/me`).flush(user);
  }

  function expectTaskList(projectId: number): TestRequest {
    const req = http.expectOne(
      (r) =>
        r.method === 'GET' && r.url === TASKS_API && r.params.get('projectId') === `${projectId}`,
    );
    expect(req.request.params.get('status')).toBe('all');
    return req;
  }

  /** Opens a project's task list and answers its project and task requests. */
  async function openList(tasks: ApiTask[] = []): Promise<void> {
    await harness.navigateByUrl(`/projects/${CAPSTONE.id}/tasks`);
    await settle();
    http.expectOne(`${PROJECTS_API}/${CAPSTONE.id}`).flush(CAPSTONE);
    expectTaskList(CAPSTONE.id).flush(tasks);
    await settle();
  }

  /** Answers the project picker's GET /api/projects if the form asked for it. */
  function answerProjects(): void {
    http.match(PROJECTS_API).forEach((req) => req.flush([INBOX, CAPSTONE]));
  }

  /** Opens the + New task popup from the list. */
  async function openNewTask(): Promise<void> {
    click('app-task-list button.new');
    await settle();
    answerProjects();
    await settle();
    expect(el('[role="dialog"] app-task-form')).toBeTruthy();
  }

  /** Opens a task's edit page and answers its GET /api/tasks/:id. */
  async function openEdit(task: ApiTask = SCHEDULED): Promise<void> {
    await harness.navigateByUrl(`/projects/${CAPSTONE.id}/tasks/${task.id}/edit`);
    await settle();
    answerProjects();
    const req = http.expectOne(`${TASKS_API}/${task.id}`);
    expect(req.request.method).toBe('GET');
    req.flush(task);
    await settle();
  }

  function expectPut(path: string): TestRequest {
    const req = http.expectOne(`${TASKS_API}/${SCHEDULED.id}/${path}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    return req;
  }

  function itemMeta(): string {
    return text('app-task-item .meta').replace(/\s+/g, ' ');
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

  // Case 1: the pickers' values reach the API in the backend's formats.
  describe('Sending the schedule', () => {
    // FE-SCH-02, FE-SCH-05, FE-SCH-10
    it('creates a task with its due date, deadline and weekly recurrence and shows it in the list', async () => {
      await startSignedIn();
      await openList();
      await openNewTask();

      type('#task-title', 'Gym');
      type('#task-due-date', '2026-11-20');
      type('#task-deadline', '2026-11-21');
      repeat('weekly');
      // A new weekly repeat starts on the due date's weekday (Friday).
      expect(checkedDays()).toEqual(['Friday']);
      toggleDay('Monday');
      endsOnDate();
      type('#task-recurrence-end-date', '2026-12-31');
      expect(text('app-recurrence-picker .summary')).toBe(
        'Repeats every week on Mon and Fri, until Dec 31',
      );
      await submit();

      const req = http.expectOne(TASKS_API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        projectId: CAPSTONE.id,
        priority: 'low',
        title: 'Gym',
        description: null,
        dueDate: '2026-11-20',
        // The end of 21 November in Manila (UTC+8), as an ISO instant.
        deadline: '2026-11-21T15:59:59.999Z',
        recurrence: 'weekly',
        recurrenceDays: [1, 5],
        recurrenceEndDate: '2026-12-31',
      });
      req.flush(
        apiTask({
          id: 6,
          title: 'Gym',
          dueDate: '2026-11-20',
          deadline: '2026-11-21T15:59:59.999Z',
          recurrence: 'weekly',
          recurrenceDays: [1, 5],
          recurrenceEndDate: '2026-12-31',
        }),
        status(201, 'Created'),
      );
      await settle();

      expect(el('[role="dialog"]')).toBeNull();
      expect(text('app-task-item .title')).toBe('Gym');
      expect(itemMeta()).toContain('Due Nov 20');
      expect(itemMeta()).toContain('Deadline Nov 21');
      expect(text('app-task-item .badge')).toBe('Every week on Mon and Fri, until Dec 31');
    });

    // FE-SCH-02, FE-SCH-05, FE-SCH-10
    it('saves changed dates and recurrence through the scheduling routes, one after another', async () => {
      await startSignedIn();
      await openEdit();

      expect(el<HTMLInputElement>('#task-due-date').value).toBe('2026-11-20');
      expect(el<HTMLInputElement>('#task-deadline').value).toBe('2026-11-20');
      expect(checkedDays()).toEqual(['Monday', 'Thursday']);
      expect(el<HTMLInputElement>('#task-recurrence-end-date').value).toBe('2026-12-31');
      // Nothing changed yet, so there is nothing to save.
      expect(el<HTMLButtonElement>('button[type="submit"]').disabled).toBe(true);

      type('#task-due-date', '2026-11-23');
      type('#task-deadline', '2026-11-25');
      repeat('daily');
      await submit();

      // Details did not change, so only the schedule routes are called, in order.
      const due = expectPut('due-date');
      expect(due.request.body).toEqual({ dueDate: '2026-11-23' });
      http.expectNone(`${TASKS_API}/${SCHEDULED.id}/deadline`);
      due.flush({ ...SCHEDULED, dueDate: '2026-11-23' });
      await settle();

      const deadline = expectPut('deadline');
      expect(deadline.request.body).toEqual({ deadline: '2026-11-25T15:59:59.999Z' });
      deadline.flush({ ...SCHEDULED, dueDate: '2026-11-23', deadline: '2026-11-25T15:59:59.999Z' });
      await settle();

      const recurrence = expectPut('recurrence');
      // Switching from weekly drops the weekdays; the end date is kept.
      expect(recurrence.request.body).toEqual({
        recurrence: 'daily',
        recurrenceDays: [],
        recurrenceEndDate: '2026-12-31',
      });
      recurrence.flush({
        ...SCHEDULED,
        dueDate: '2026-11-23',
        deadline: '2026-11-25T15:59:59.999Z',
        recurrence: 'daily',
        recurrenceDays: [],
      });
      await settle();

      expect(text('.form-notice')).toBe('Changes saved.');
      expect(el<HTMLInputElement>('#task-due-date').value).toBe('2026-11-23');
      expect(el<HTMLInputElement>('#task-deadline').value).toBe('2026-11-25');
      expect(radio('task-recurrence', 'daily').checked).toBe(true);
      expect(el<HTMLButtonElement>('button[type="submit"]').disabled).toBe(true);
    });
  });

  // Case 2: validators stop bad schedules before they reach the API.
  describe('Validation', () => {
    // FE-SCH-03
    it('blocks a deadline before the due date with a message and sends no request', async () => {
      await startSignedIn();
      await openList();
      await openNewTask();

      type('#task-title', 'Essay');
      type('#task-due-date', '2026-11-20');
      type('#task-deadline', '2026-11-18');

      expect(text('#task-deadline-status')).toBe("The deadline can't be before the due date.");
      expect(el('#task-deadline').getAttribute('aria-invalid')).toBe('true');
      // The calendar starts at the due date.
      expect(el('#task-deadline').getAttribute('min')).toBe('2026-11-20');

      await submit();
      http.expectNone(TASKS_API);
      expect(el('[role="dialog"]')).toBeTruthy();

      // The same day is allowed.
      type('#task-deadline', '2026-11-20');
      expect(text('#task-deadline-status')).toBe('');
      await submit();
      http.expectOne(TASKS_API).flush(apiTask({ id: 7, title: 'Essay' }), status(201, 'Created'));
      await settle();
    });

    // FE-SCH-03
    it('asks for a due date and weekdays before saving a repeating task', async () => {
      await startSignedIn();
      await openList();
      await openNewTask();

      type('#task-title', 'Stretch');
      repeat('weekly');
      expect(text('#task-due-date-status')).toBe('Repeating tasks need a due date.');
      toggleDay(checkedDays()[0]);
      expect(text('#task-recurrence-days-status')).toBe('Pick at least one day.');

      await submit();
      http.expectNone(TASKS_API);
    });

    // FE-SCH-03
    it('blocks a recurrence end date before the due date', async () => {
      await startSignedIn();
      await openList();
      await openNewTask();

      type('#task-title', 'Read');
      type('#task-due-date', '2026-11-20');
      repeat('daily');
      endsOnDate();
      type('#task-recurrence-end-date', '2026-11-19');

      expect(text('#task-recurrence-end-date-status')).toBe(
        "The end date can't be before the due date.",
      );
      await submit();
      http.expectNone(TASKS_API);
    });
  });

  // Case 3: clearing sends null (or 'none'), which the backend treats as "remove".
  describe('Clearing the schedule', () => {
    // FE-SCH-02, FE-SCH-05, FE-SCH-10
    it('sends null for a cleared due date and deadline and none for a removed recurrence', async () => {
      await startSignedIn();
      await openEdit();

      click('button[aria-label="Clear due date"]');
      click('button[aria-label="Clear deadline"]');
      repeat('none');
      expect(el('button[aria-label="Clear due date"]')).toBeNull();
      expect(el('.ends')).toBeNull();
      expect(el('app-recurrence-picker .summary')).toBeNull();
      await submit();

      const due = expectPut('due-date');
      expect(due.request.body).toEqual({ dueDate: null });
      due.flush({ ...SCHEDULED, dueDate: null });
      await settle();

      const deadline = expectPut('deadline');
      expect(deadline.request.body).toEqual({ deadline: null });
      deadline.flush({ ...SCHEDULED, dueDate: null, deadline: null });
      await settle();

      const recurrence = expectPut('recurrence');
      expect(recurrence.request.body).toEqual({
        recurrence: 'none',
        recurrenceDays: [],
        recurrenceEndDate: null,
      });
      recurrence.flush(apiTask({ recurrence: 'none' }));
      await settle();

      expect(text('.form-notice')).toBe('Changes saved.');
      expect(el<HTMLInputElement>('#task-due-date').value).toBe('');
      expect(el<HTMLInputElement>('#task-deadline').value).toBe('');
    });

    // FE-SCH-10
    it('clears only the deadline when only the deadline changed', async () => {
      await startSignedIn();
      await openEdit();

      click('button[aria-label="Clear deadline"]');
      await submit();

      const deadline = expectPut('deadline');
      expect(deadline.request.body).toEqual({ deadline: null });
      deadline.flush({ ...SCHEDULED, deadline: null });
      await settle();

      http.expectNone(`${TASKS_API}/${SCHEDULED.id}/due-date`);
      http.expectNone(`${TASKS_API}/${SCHEDULED.id}/recurrence`);
      expect(text('.form-notice')).toBe('Changes saved.');
    });
  });

  // Case 4: recurring tasks say how they repeat.
  describe('Recurrence labels', () => {
    // FE-SCH-05
    it.each([
      [{ recurrence: 'daily' as const, dueDate: '2026-11-20' }, 'Every day'],
      [{ recurrence: 'monthly' as const, dueDate: '2026-11-20' }, 'Every month'],
      [
        {
          recurrence: 'weekly' as const,
          dueDate: '2026-11-20',
          recurrenceDays: [1, 3, 5] as never,
        },
        'Every week on Mon, Wed and Fri',
      ],
      [
        {
          recurrence: 'weekly' as const,
          dueDate: '2026-11-20',
          recurrenceDays: [2] as never,
          recurrenceEndDate: '2026-12-31',
        },
        'Every week on Tue, until Dec 31',
      ],
    ])('shows %o as "%s" in the list', async (fields, label) => {
      await startSignedIn();
      await openList([apiTask(fields), apiTask({ id: 8, title: 'One-off' })]);

      const [recurring, oneOff] = all('app-task-item');
      expect(recurring.querySelector('.badge')?.textContent?.trim()).toBe(label);
      expect(oneOff.querySelector('.badge')).toBeNull();
    });
  });

  // Case 5: dates show in the session user's timezone.
  describe('Timezone', () => {
    // A deadline at 20:00 UTC on 20 November is already 21 November in Manila (UTC+8).
    const LATE = apiTask({ dueDate: '2026-11-20', deadline: '2026-11-20T20:00:00.000Z' });

    // FE-SCH-07
    it.each([
      ['Asia/Manila', 'Nov 21', '2026-11-21'],
      ['Europe/London', 'Nov 20', '2026-11-20'],
    ])('shows the deadline for a %s user as %s', async (timezone, shown, inputValue) => {
      await startSignedIn({ ...USER, timezone });
      await openList([LATE]);

      expect(itemMeta()).toContain('Due Nov 20');
      expect(itemMeta()).toContain(`Deadline ${shown}`);

      await openEdit(LATE);
      expect(el<HTMLInputElement>('#task-deadline').value).toBe(inputValue);
    });

    // FE-SCH-07
    it.each([
      ['Asia/Manila', '2026-11-20T15:59:59.999Z'],
      ['Europe/London', '2026-11-20T23:59:59.999Z'],
    ])('sends a %s deadline as the end of that day there', async (timezone, instant) => {
      await startSignedIn({ ...USER, timezone });
      await openList();
      await openNewTask();

      type('#task-title', 'Submit');
      type('#task-deadline', '2026-11-20');
      await submit();

      const req = http.expectOne(TASKS_API);
      expect(req.request.body.deadline).toBe(instant);
      req.flush(apiTask({ id: 9, title: 'Submit', deadline: instant }), status(201, 'Created'));
      await settle();
      expect(itemMeta()).toContain('Deadline Nov 20');
    });
  });

  // Case 6: completing a recurring task.
  describe('Completing a recurring task', () => {
    // FE-SCH-08: the Scheduling spec's PUT /api/tasks/{taskId}/complete (IV.D), which returns the
    // next occurrence, is not in the backend or frontend yet, and the task list has no complete
    // control. Write this test when that route exists.
    it.todo('shows the next occurrence returned by the API after completing a recurring task');
  });

  // Case 7: error responses.
  describe('Errors', () => {
    // FE-SCH-06
    it('shows a 400 on the field it is about and keeps the edits and the saved task', async () => {
      await startSignedIn();
      await openEdit();

      type('#task-deadline', '2026-11-22');
      await submit();

      // Body from validate-request.middleware.ts with the deadline route's message.
      expectPut('deadline').flush(
        {
          error: 'Invalid deadline',
          details: [{ field: 'deadline', message: 'Invalid ISO datetime' }],
        },
        status(400, 'Bad Request'),
      );
      await settle();

      expect(text('#task-deadline-status')).toBe('Invalid deadline');
      expect(el('#task-deadline').getAttribute('aria-invalid')).toBe('true');
      expect(el<HTMLInputElement>('#task-deadline').value).toBe('2026-11-22');
      expect(el('.form-notice')).toBeNull();

      // Editing the field clears the server's message.
      type('#task-deadline', '2026-11-23');
      expect(text('#task-deadline-status')).toBe('');
    });

    // FE-SCH-06
    it('keeps an earlier part of the schedule that saved when a later part fails', async () => {
      await startSignedIn();
      await openEdit();

      type('#task-due-date', '2026-11-23');
      type('#task-deadline', '2026-11-24');
      await submit();

      expectPut('due-date').flush({ ...SCHEDULED, dueDate: '2026-11-23' });
      await settle();
      expectPut('deadline').flush({ error: 'Internal server error' }, status(500));
      await settle();

      expect(text('.form-error')).toBe('Something went wrong. Please try again.');
      http.expectNone(`${TASKS_API}/${SCHEDULED.id}/recurrence`);

      // Only the deadline is left to save.
      await submit();
      const retry = expectPut('deadline');
      expect(retry.request.body).toEqual({ deadline: '2026-11-24T15:59:59.999Z' });
      http.expectNone(`${TASKS_API}/${SCHEDULED.id}/due-date`);
      retry.flush({ ...SCHEDULED, dueDate: '2026-11-23', deadline: '2026-11-24T15:59:59.999Z' });
      await settle();
      expect(text('.form-notice')).toBe('Changes saved.');
    });

    // FE-SCH-09
    it('shows "Task not found." on a 404 and reloads the project\'s tasks', async () => {
      await startSignedIn();
      await openEdit();

      // Still on or before the saved deadline (20 November), so the form is valid.
      type('#task-due-date', '2026-11-19');
      await submit();
      expectPut('due-date').flush({ error: 'Task not found' }, status(404, 'Not Found'));
      await settle();

      expect(text('.form-error')).toBe('Task not found.');
      expectTaskList(CAPSTONE.id).flush([]);
      await settle();
    });

    // FE-SCH-09
    it('clears the session and returns to /login on a 401', async () => {
      await startSignedIn();
      await openEdit();

      repeat('monthly');
      await submit();
      expectPut('recurrence').flush(
        { error: 'Token invalid or expired' },
        status(401, 'Unauthorized'),
      );
      await settle();

      expect(router.url).toBe('/login');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });

  // Task Organization: the priority dropdown on the task form.
  describe('Priority', () => {
    // PUT /api/tasks/{taskId} answers with this, not the task (task-crud.controller.ts).
    const UPDATED = { taskId: SCHEDULED.id, message: 'Task updated successfully' };

    /** The dropdown uses [ngValue], so options are chosen by their label. */
    function choosePriority(label: 'High' | 'Medium' | 'Low'): void {
      const select = el<HTMLSelectElement>('#task-priority');
      select.selectedIndex = [...select.options].findIndex((o) => o.textContent?.trim() === label);
      select.dispatchEvent(new Event('change'));
      harness.detectChanges();
    }

    function selectedPriority(): string | undefined {
      const select = el<HTMLSelectElement>('#task-priority');
      return select.options[select.selectedIndex]?.textContent?.trim();
    }

    function expectDetailsPut(): TestRequest {
      const req = http.expectOne(`${TASKS_API}/${SCHEDULED.id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
      return req;
    }

    function saveButton(): HTMLButtonElement {
      return el<HTMLButtonElement>('button[type="submit"]');
    }

    // FE-ORG-01
    it('creates a task with the chosen priority and shows it on the task', async () => {
      await startSignedIn();
      await openList();
      await openNewTask();

      // New tasks start at the lowest priority.
      expect(selectedPriority()).toBe('Low');
      type('#task-title', 'Prepare slides');
      choosePriority('High');
      await submit();

      const req = http.expectOne(TASKS_API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toMatchObject({ title: 'Prepare slides', priority: 'high' });
      expect(req.request.body).not.toHaveProperty('priorityId');
      req.flush(
        apiTask({ id: 11, title: 'Prepare slides', priority: 'high' }),
        status(201, 'Created'),
      );
      await settle();

      const badge = el('app-task-item .priority');
      expect(badge.textContent?.trim()).toBe('High');
      expect(badge.getAttribute('data-priority')).toBe('1');
      expect(badge.getAttribute('aria-label')).toBe('High priority');
    });

    // FE-ORG-01
    it.each([
      ['high', 'High'],
      ['medium', 'Medium'],
      ['low', 'Low'],
    ] as const)('shows a %s task from the API as %s', async (priority, label) => {
      await startSignedIn();
      await openList([apiTask({ priority })]);

      expect(text('app-task-item .priority')).toBe(label);
    });

    // FE-ORG-01
    it('saves a changed priority alone with PUT /api/tasks/{id} and keeps it', async () => {
      await startSignedIn();
      await openEdit();

      expect(selectedPriority()).toBe('Low');
      choosePriority('Medium');
      expect(saveButton().disabled).toBe(false);
      await submit();

      const req = expectDetailsPut();
      expect(req.request.body).toEqual({ priority: 'medium' });
      // Nothing about the schedule changed, so no scheduling route is called.
      http.expectNone((r) => r.url.startsWith(`${TASKS_API}/${SCHEDULED.id}/`));
      req.flush(UPDATED);
      await settle();

      expect(text('.form-notice')).toBe('Changes saved.');
      expect(selectedPriority()).toBe('Medium');
      // The stored task now has the new priority, so there is nothing left to save.
      expect(saveButton().disabled).toBe(true);
    });

    // FE-ORG-01
    it('saves the priority before the schedule when both change', async () => {
      await startSignedIn();
      await openEdit();

      choosePriority('High');
      type('#task-due-date', '2026-11-19');
      await submit();

      const details = expectDetailsPut();
      expect(details.request.body).toEqual({ priority: 'high' });
      http.expectNone(`${TASKS_API}/${SCHEDULED.id}/due-date`);
      details.flush(UPDATED);
      await settle();

      const due = http.expectOne(`${TASKS_API}/${SCHEDULED.id}/due-date`);
      expect(due.request.body).toEqual({ dueDate: '2026-11-19' });
      due.flush({ ...SCHEDULED, priority: 'high', dueDate: '2026-11-19' });
      await settle();

      expect(text('.form-notice')).toBe('Changes saved.');
      expect(selectedPriority()).toBe('High');
    });

    // FE-ORG-05, FE-ORG-07
    it('shows a 400 and keeps the chosen priority to try again', async () => {
      await startSignedIn();
      await openEdit();

      choosePriority('High');
      await submit();
      // Body from validate-request.middleware.ts for the update route.
      expectDetailsPut().flush(
        {
          error: 'Invalid task update',
          details: [
            { field: 'priority', message: 'Invalid option: expected one of "low"|"medium"|"high"' },
          ],
        },
        status(400, 'Bad Request'),
      );
      await settle();

      expect(text('.form-error')).toBe('Invalid task update');
      expect(el('.form-notice')).toBeNull();
      expect(selectedPriority()).toBe('High');
      // The saved task is unchanged, so the change can be sent again.
      expect(saveButton().disabled).toBe(false);
      http.expectNone((r) => r.url.startsWith(`${TASKS_API}/${SCHEDULED.id}/`));
    });

    // FE-ORG-05, FE-ORG-07
    it('shows "Task not found." on a 404 and reloads the project\'s tasks', async () => {
      await startSignedIn();
      await openEdit();

      choosePriority('Medium');
      await submit();
      expectDetailsPut().flush({ error: 'Task not found' }, status(404, 'Not Found'));
      await settle();

      expect(text('.form-error')).toBe('Task not found.');
      expectTaskList(CAPSTONE.id).flush([]);
      await settle();
    });

    // FE-ORG-07
    it('clears the session and returns to /login on a 401', async () => {
      await startSignedIn();
      await openEdit();

      choosePriority('High');
      await submit();
      expectDetailsPut().flush({ error: 'Token invalid or expired' }, status(401, 'Unauthorized'));
      await settle();

      expect(router.url).toBe('/login');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });
});
