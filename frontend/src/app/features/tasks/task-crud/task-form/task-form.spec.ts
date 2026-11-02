import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../../environments/environment';
import { SessionService } from '../../../auth/session/session.service';
import type { ApiProject, Project } from '../../../projects/shared/types/project.types';
import { TasksStore } from '../../shared/state/tasks.store';
import { asApiTask } from '../../shared/testing/api-task';
import type { Task } from '../../shared/types/task.types';
import { TaskForm } from './task-form';

@Component({ template: '' })
class Blank {}

const URL = `${environment.apiBaseUrl}/api/tasks`;
const LIST_QUERY = 'status=all&pageSize=100';
const PROJECTS_URL = `${environment.apiBaseUrl}/api/projects`;

/** Projects as the API sends them: `id` instead of `projectId`. */
const asApi = ({ projectId, ...rest }: Project): ApiProject => ({ id: projectId, ...rest });

const project = (projectId: number, name: string, isInbox = false): Project => ({
  projectId,
  name,
  description: null,
  color: null,
  isInbox,
  isFavorite: false,
  isArchived: false,
  sortOrder: projectId,
});
const PROJECTS = [project(1, 'Inbox', true), project(10, 'Capstone'), project(11, 'Gym')];

const STUDY: Task = {
  taskId: 1,
  projectId: 10,
  priorityId: 2,
  title: 'Study ILT Module 4',
  description: 'Read all lessons',
  dueDate: '2026-10-02',
  // The end of Oct 5 for a user in Asia/Manila (UTC+8).
  deadline: '2026-10-05T15:59:59.999Z',
  recurrence: 'none',
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [],
};
const TASK_REPLY = asApiTask(STUDY);

describe('TaskForm', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';
  const messageFor = (id: string) => text(`#${id}-status`);
  const saveButton = () => el<HTMLButtonElement>('button[type="submit"]');
  const value = (id: string) => el<HTMLInputElement>(`#${id}`).value;
  const selected = (id: string) => {
    const select = el<HTMLSelectElement>(`#${id}`);
    return select.options[select.selectedIndex]?.textContent?.trim();
  };

  function type(id: string, input: string): void {
    const field = el<HTMLInputElement | HTMLTextAreaElement>(`#${id}`);
    field.value = input;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    harness.detectChanges();
  }

  function repeat(label: string): void {
    const option = [...page().querySelectorAll('.option')].find(
      (o) => o.textContent?.trim() === label,
    );
    option!.querySelector('input')!.click();
    harness.detectChanges();
  }

  function choose(id: string, label: string): void {
    const select = el<HTMLSelectElement>(`#${id}`);
    const option = [...select.options].find((o) => o.textContent?.trim() === label);
    select.value = option!.value;
    select.dispatchEvent(new Event('change'));
    harness.detectChanges();
  }

  function submit(): void {
    el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    harness.detectChanges();
  }

  function fail(url: string, status: number, error: string | null = null): void {
    http.expectOne(url).flush(error ? { error } : null, { status, statusText: 'Error' });
    harness.detectChanges();
  }

  function flushProjects(): void {
    http.expectOne(PROJECTS_URL).flush(PROJECTS.map(asApi));
    harness.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            // Componentless like the real route, so children inherit :projectId.
            path: 'projects/:projectId/tasks',
            children: [
              { path: '', component: Blank },
              { path: 'new', component: TaskForm, data: { mode: 'create' } },
              { path: ':taskId/edit', component: TaskForm, data: { mode: 'edit' } },
            ],
          },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: { currentUser: () => ({ timezone: 'Asia/Manila' }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  describe('create mode', () => {
    let closed: number;
    let created: Task[];

    /** Create mode only runs inside the popup, which sets TasksStore.creating first. */
    async function openPopup(): Promise<void> {
      TestBed.inject(TasksStore).creating.set({ projectId: 10 });
      await harness.navigateByUrl('/projects/10/tasks/new');
      const form = harness.routeDebugElement!.componentInstance as TaskForm;
      closed = 0;
      created = [];
      form.closed.subscribe(() => closed++);
      form.created.subscribe((task) => created.push(task));
    }

    beforeEach(async () => {
      await openPopup();
      flushProjects();
    });

    it('shows labelled fields, with the lowest priority and this project picked', () => {
      expect(text('#new-task-title')).toBe('New task');
      for (const id of [
        'task-title',
        'task-description',
        'task-priority',
        'task-project',
        'task-due-date',
        'task-deadline',
      ]) {
        expect(el(`#${id}`)).toBeTruthy();
        expect(el(`label[for="${id}"]`)).toBeTruthy();
      }
      expect(text('.schedule h2')).toBe('Date and deadline');
      expect(text('legend')).toBe('Repeat');
      expect(selected('task-priority')).toBe('Low');
      expect(selected('task-project')).toBe('Capstone');
      expect(el<HTMLSelectElement>('#task-project').options).toHaveLength(3);
      expect(saveButton().textContent).toContain('Add task');
    });

    it('requires a title and makes no request when submitted empty', () => {
      submit();

      expect(messageFor('task-title')).toBe('Task title is required.');
      http.expectNone(URL);
    });

    it('shows a length error while typing and blocks the submit', () => {
      type('task-title', 'a'.repeat(201));

      expect(messageFor('task-title')).toBe('Use 200 characters or fewer.');
      expect(text('.count')).toBe('201/200');

      submit();
      http.expectNone(URL);
    });

    it('sends a trimmed title with empty optional fields as null', () => {
      type('task-title', '  Study ILT Module 4  ');
      submit();

      const req = http.expectOne(URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        projectId: 10,
        priority: 'low',
        title: 'Study ILT Module 4',
        description: null,
        dueDate: null,
        deadline: null,
        recurrence: 'none',
      });
      req.flush(TASK_REPLY);
    });

    it("sends every field the user filled in, with the deadline in the user's timezone", () => {
      type('task-title', 'Gym session');
      type('task-description', 'Leg day');
      choose('task-priority', 'High');
      choose('task-project', 'Gym');
      type('task-due-date', '2026-10-02');
      type('task-deadline', '2026-10-03');
      repeat('Weekly');
      submit();

      expect(http.expectOne(URL).request.body).toEqual({
        projectId: 11,
        priority: 'high',
        title: 'Gym session',
        description: 'Leg day',
        dueDate: '2026-10-02',
        deadline: '2026-10-03T15:59:59.999Z',
        recurrence: 'weekly',
      });
    });

    it('reports the new task, without leaving the page', async () => {
      type('task-title', 'Gym session');
      choose('task-project', 'Gym');
      submit();
      http.expectOne(URL).flush({ ...TASK_REPLY, id: 5, projectId: 11 });
      await harness.fixture.whenStable();

      expect(created.map((task) => task.taskId)).toEqual([5]);
      expect(router.url).toBe('/projects/10/tasks/new');
    });

    it('needs a due date for a repeating task', () => {
      type('task-title', 'Study');
      repeat('Daily');

      expect(messageFor('task-due-date')).toBe('Repeating tasks need a due date.');
      submit();
      http.expectNone(URL);

      type('task-due-date', '2026-10-02');
      expect(messageFor('task-due-date')).toBe('');
      submit();
      http.expectOne(URL).flush(TASK_REPLY);
    });

    it('allows a deadline on the due date', () => {
      type('task-title', 'Study');
      type('task-due-date', '2026-10-05');
      type('task-deadline', '2026-10-05');

      expect(messageFor('task-deadline')).toBe('');
      submit();
      http.expectOne(URL).flush(TASK_REPLY);
    });

    it('does not allow a deadline before the due date', () => {
      type('task-title', 'Study');
      type('task-due-date', '2026-10-05');
      type('task-deadline', '2026-10-01');

      expect(messageFor('task-deadline')).toBe("The deadline can't be before the due date.");
      expect(el<HTMLInputElement>('#task-deadline').min).toBe('2026-10-05');
      submit();
      http.expectNone(URL);
    });

    it('disables the button while saving and ignores a second submit', () => {
      type('task-title', 'Study');
      submit();
      submit();

      expect(saveButton().disabled).toBe(true);
      expect(saveButton().textContent).toContain('Adding…');
      http.expectOne(URL).flush(TASK_REPLY);
    });

    it('shows a 400 on the field it names and keeps the input', () => {
      type('task-title', 'Study');
      type('task-due-date', '2026-10-02');
      submit();
      fail(URL, 400, 'Deadline cannot be earlier than due date');

      expect(messageFor('task-deadline')).toBe('Deadline cannot be earlier than due date');
      expect(value('task-title')).toBe('Study');
      expect(saveButton().disabled).toBe(false);

      type('task-deadline', '2026-10-03');
      expect(messageFor('task-deadline')).toBe('');
    });

    it('shows a recurrence error on the recurrence field', () => {
      type('task-title', 'Study');
      submit();
      fail(URL, 400, 'Invalid recurrence rule');

      expect(messageFor('task-recurrence')).toBe('Invalid recurrence rule');

      type('task-due-date', '2026-10-02');
      repeat('Daily');
      expect(messageFor('task-recurrence')).toBe('');
    });

    it('shows a missing target project on the project field', () => {
      type('task-title', 'Study');
      submit();
      fail(URL, 404, 'Project not found');

      expect(messageFor('task-project')).toBe('Project not found.');
    });

    it('shows a generic error on a server failure so the user can retry', () => {
      type('task-title', 'Study');
      submit();
      fail(URL, 500);

      expect(text('.form-error')).toBe('Something went wrong. Please try again.');

      submit();
      http.expectOne(URL).flush(TASK_REPLY);
    });

    it('closes with Escape without saving, and only once', async () => {
      type('task-title', 'Study');
      el('form').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await harness.fixture.whenStable();

      expect(closed).toBe(1);
      http.expectNone(URL);
    });
  });

  describe('create mode without a project', () => {
    beforeEach(async () => {
      TestBed.inject(TasksStore).creating.set({ projectId: null });
      await harness.navigateByUrl('/projects/10/tasks/new');
    });

    it('picks the Inbox once the projects load', () => {
      flushProjects();

      expect(selected('task-project')).toBe('Inbox');
    });

    it('lets the server use the Inbox when the projects could not load', () => {
      http.expectOne(PROJECTS_URL).flush(null, { status: 500, statusText: 'Error' });
      harness.detectChanges();
      type('task-title', 'Study');
      submit();

      const req = http.expectOne(URL);
      expect(req.request.body.projectId).toBeUndefined();
      req.flush(TASK_REPLY);
    });
  });

  it('treats a non-numeric project id as not found without a request', async () => {
    await harness.navigateByUrl('/projects/abc/tasks/new');

    expect(text('.message p')).toBe('Project not found.');
    expect(el('form')).toBeNull();
  });

  describe('edit mode', () => {
    async function open(task: Task = STUDY): Promise<void> {
      await harness.navigateByUrl(`/projects/10/tasks/${task.taskId}/edit`);
      flushProjects();
      expect(text('[role="status"]')).toBe('Loading task…');
      http.expectOne(`${URL}/${task.taskId}`).flush(asApiTask(task));
      harness.detectChanges();
    }

    it('fills the form with the current values', async () => {
      await open();

      expect(text('h1')).toBe('Edit task');
      expect(value('task-title')).toBe('Study ILT Module 4');
      expect(el<HTMLTextAreaElement>('#task-description').value).toBe('Read all lessons');
      expect(selected('task-priority')).toBe('Medium');
      expect(selected('task-project')).toBe('Capstone');
      expect(value('task-due-date')).toBe('2026-10-02');
      expect(value('task-deadline')).toBe('2026-10-05');
    });

    it("shows the deadline on its day in the user's timezone", async () => {
      await open({ ...STUDY, deadline: '2026-10-05T17:00:00.000Z' });

      expect(value('task-deadline')).toBe('2026-10-06');
      expect(saveButton().disabled).toBe(true);
    });

    it('shows the saved recurrence', async () => {
      await open({ ...STUDY, recurrence: 'monthly', isRecurring: true });

      expect(text('.summary')).toBe('Repeats every month');
    });

    it('keeps Save off until something changes', async () => {
      await open();
      expect(saveButton().disabled).toBe(true);

      type('task-title', 'Study module 5');
      expect(saveButton().disabled).toBe(false);

      type('task-title', 'Study ILT Module 4');
      expect(saveButton().disabled).toBe(true);
    });

    it('sends only the changed details and confirms the save', async () => {
      await open();
      type('task-title', 'Study module 5');
      choose('task-priority', 'High');
      submit();

      const req = http.expectOne(`${URL}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ title: 'Study module 5', priority: 'high' });
      req.flush({ taskId: 1, message: 'Task updated successfully' });
      harness.detectChanges();

      http.expectNone(`${URL}/1/due-date`);
      http.expectNone(`${URL}/1/deadline`);
      http.expectNone(`${URL}/1/recurrence`);
      expect(text('.form-notice')).toBe('Changes saved.');
      expect(saveButton().disabled).toBe(true);
    });

    it('sends a schedule change to its own endpoint only', async () => {
      await open();
      type('task-deadline', '2026-10-09');
      submit();

      const req = http.expectOne(`${URL}/1/deadline`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ deadline: '2026-10-09T15:59:59.999Z' });
      req.flush({ ...TASK_REPLY, deadline: '2026-10-09T15:59:59.999Z' });
      harness.detectChanges();

      expect(text('.form-notice')).toBe('Changes saved.');
      expect(value('task-deadline')).toBe('2026-10-09');
    });

    it('changes and removes the recurrence', async () => {
      await open();
      repeat('Weekly');
      submit();

      const set = http.expectOne(`${URL}/1/recurrence`);
      expect(set.request.body).toEqual({ recurrence: 'weekly' });
      set.flush({ ...TASK_REPLY, recurrence: 'weekly' });
      harness.detectChanges();
      expect(text('.summary')).toBe('Repeats every week');

      repeat('Never');
      submit();

      const clear = http.expectOne(`${URL}/1/recurrence`);
      expect(clear.request.body).toEqual({ recurrence: 'none' });
      clear.flush(TASK_REPLY);
    });

    it('saves details first, then clears the schedule with nulls', async () => {
      await open();
      type('task-description', '');
      type('task-due-date', '');
      type('task-deadline', '');
      submit();

      const details = http.expectOne(`${URL}/1`);
      expect(details.request.body).toEqual({ description: null });
      details.flush({ taskId: 1, message: 'Task updated successfully' });

      const dueDate = http.expectOne(`${URL}/1/due-date`);
      expect(dueDate.request.body).toEqual({ dueDate: null });
      dueDate.flush({ ...TASK_REPLY, dueDate: null });

      const deadline = http.expectOne(`${URL}/1/deadline`);
      expect(deadline.request.body).toEqual({ deadline: null });
      deadline.flush({ ...TASK_REPLY, dueDate: null, deadline: null });
      harness.detectChanges();

      expect(text('.form-notice')).toBe('Changes saved.');
    });

    it('moves the task to another project', async () => {
      await open();
      choose('task-project', 'Gym');
      submit();

      expect(http.expectOne(`${URL}/1`).request.body).toEqual({ projectId: 11 });
    });

    it('offers only the unsaved part again when the schedule fails after the details saved', async () => {
      await open();
      type('task-title', 'Study module 5');
      type('task-deadline', '2026-10-09');
      submit();

      http.expectOne(`${URL}/1`).flush({ taskId: 1, message: 'Task updated successfully' });
      fail(`${URL}/1/deadline`, 400, 'Invalid deadline');

      expect(messageFor('task-deadline')).toBe('Invalid deadline');
      expect(saveButton().disabled).toBe(false);

      submit();
      http.expectNone(`${URL}/1`);
      expect(http.expectOne(`${URL}/1/deadline`).request.body).toEqual({
        deadline: '2026-10-09T15:59:59.999Z',
      });
    });

    it('keeps the due date of a repeating task', async () => {
      await open({ ...STUDY, recurrence: 'weekly', isRecurring: true });

      type('task-due-date', '');

      expect(messageFor('task-due-date')).toBe('Repeating tasks need a due date.');
      submit();
      http.expectNone(`${URL}/1/due-date`);
    });

    it('clears a date with its Clear button', async () => {
      await open();
      el<HTMLButtonElement>('button[aria-label="Clear deadline"]').click();
      harness.detectChanges();
      submit();

      expect(http.expectOne(`${URL}/1/deadline`).request.body).toEqual({ deadline: null });
    });

    it('shows "Task not found" and refreshes the list when the save returns 404', async () => {
      await open();
      type('task-title', 'Study module 5');
      submit();
      fail(`${URL}/1`, 404, 'Invalid updating task.');

      expect(text('.form-error')).toBe('Task not found.');
      http.expectOne(`${URL}?projectId=10&${LIST_QUERY}`).flush([]);
    });

    it('shows "Task not found" when the task cannot be loaded', async () => {
      await harness.navigateByUrl('/projects/10/tasks/99/edit');
      flushProjects();
      fail(`${URL}/99`, 404, 'Task not found');

      expect(text('.message p')).toBe('Task not found.');
      expect(el('form')).toBeNull();
    });

    it('treats a non-numeric task id as not found without a task request', async () => {
      await harness.navigateByUrl('/projects/10/tasks/abc/edit');
      flushProjects();

      expect(text('.message p')).toBe('Task not found.');
    });

    it('offers a retry when loading fails', async () => {
      await harness.navigateByUrl('/projects/10/tasks/1/edit');
      flushProjects();
      fail(`${URL}/1`, 500);

      el<HTMLButtonElement>('.message button').click();
      http.expectOne(`${URL}/1`).flush(TASK_REPLY);
      harness.detectChanges();

      expect(value('task-title')).toBe('Study ILT Module 4');
    });
  });
});
