import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../../environments/environment';
import type { ApiProject, Project } from '../../../projects/shared/types/project.types';
import type { Task } from '../../shared/types/task.types';
import { TaskForm } from './task-form';

@Component({ template: '' })
class Blank {}

const URL = `${environment.apiBaseUrl}/api/tasks`;
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
  dueTime: '18:00:00',
  deadline: '2026-10-05',
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [],
};
const SCHEDULE_REPLY = {
  taskId: 1,
  dueDate: '2026-10-02',
  dueTime: '18:00:00',
  deadline: '2026-10-05',
  status: 'upcoming',
  message: 'Task rescheduled successfully',
};

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
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  describe('create mode', () => {
    beforeEach(async () => {
      await harness.navigateByUrl('/projects/10/tasks/new');
      flushProjects();
    });

    it('shows labelled fields, with the lowest priority and this project picked', () => {
      expect(text('h1')).toBe('New task');
      for (const id of [
        'task-title',
        'task-description',
        'task-priority',
        'task-project',
        'task-due-date',
        'task-due-time',
        'task-deadline',
      ]) {
        expect(el(`#${id}`)).toBeTruthy();
        expect(el(`label[for="${id}"]`)).toBeTruthy();
      }
      expect(selected('task-priority')).toBe('Priority 4');
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
        priorityId: 4,
        title: 'Study ILT Module 4',
        description: null,
        dueDate: null,
        dueTime: null,
        deadline: null,
      });
      req.flush(STUDY);
    });

    it('sends every field the user filled in, with the time in HH:mm:ss', () => {
      type('task-title', 'Gym session');
      type('task-description', 'Leg day');
      choose('task-priority', 'Priority 1');
      choose('task-project', 'Gym');
      type('task-due-date', '2026-10-02');
      type('task-due-time', '18:00');
      type('task-deadline', '2026-10-03');
      submit();

      expect(http.expectOne(URL).request.body).toEqual({
        projectId: 11,
        priorityId: 1,
        title: 'Gym session',
        description: 'Leg day',
        dueDate: '2026-10-02',
        dueTime: '18:00:00',
        deadline: '2026-10-03',
      });
    });

    it("goes to the list of the task's project after adding", async () => {
      type('task-title', 'Gym session');
      choose('task-project', 'Gym');
      submit();
      http.expectOne(URL).flush({ ...STUDY, taskId: 5, projectId: 11 });
      await harness.fixture.whenStable();

      expect(router.url).toBe('/projects/11/tasks');
    });

    it('needs a due date before a due time', () => {
      type('task-title', 'Study');
      type('task-due-time', '18:00');

      expect(messageFor('task-due-time')).toBe('Add a due date to set a time.');
      submit();
      http.expectNone(URL);
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
      http.expectOne(URL).flush(STUDY);
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
      http.expectOne(URL).flush(STUDY);
    });

    it('closes with Escape without saving', async () => {
      type('task-title', 'Study');
      el('form').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await harness.fixture.whenStable();

      expect(router.url).toBe('/projects/10/tasks');
      http.expectNone(URL);
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
      http.expectOne(`${URL}/${task.taskId}`).flush(task);
      harness.detectChanges();
    }

    it('fills the form with the current values', async () => {
      await open();

      expect(text('h1')).toBe('Edit task');
      expect(value('task-title')).toBe('Study ILT Module 4');
      expect(el<HTMLTextAreaElement>('#task-description').value).toBe('Read all lessons');
      expect(selected('task-priority')).toBe('Priority 2');
      expect(selected('task-project')).toBe('Capstone');
      expect(value('task-due-date')).toBe('2026-10-02');
      expect(value('task-due-time')).toBe('18:00');
      expect(value('task-deadline')).toBe('2026-10-05');
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
      choose('task-priority', 'Priority 1');
      submit();

      const req = http.expectOne(`${URL}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ title: 'Study module 5', priorityId: 1 });
      req.flush({ taskId: 1, message: 'Task updated successfully' });
      harness.detectChanges();

      http.expectNone(`${URL}/1/schedule`);
      expect(text('.form-notice')).toBe('Changes saved.');
      expect(saveButton().disabled).toBe(true);
    });

    it('sends schedule changes to the reschedule endpoint only', async () => {
      await open();
      type('task-deadline', '2026-10-09');
      submit();

      const req = http.expectOne(`${URL}/1/schedule`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ deadline: '2026-10-09' });
      req.flush({ ...SCHEDULE_REPLY, deadline: '2026-10-09' });
      harness.detectChanges();

      expect(text('.form-notice')).toBe('Changes saved.');
      expect(value('task-deadline')).toBe('2026-10-09');
    });

    it('saves details first, then clears the schedule with nulls', async () => {
      await open();
      type('task-description', '');
      type('task-due-date', '');
      type('task-due-time', '');
      type('task-deadline', '');
      submit();

      const details = http.expectOne(`${URL}/1`);
      expect(details.request.body).toEqual({ description: null });
      details.flush({ taskId: 1, message: 'Task updated successfully' });

      const schedule = http.expectOne(`${URL}/1/schedule`);
      expect(schedule.request.body).toEqual({ dueDate: null, dueTime: null, deadline: null });
      schedule.flush({ ...SCHEDULE_REPLY, dueDate: null, dueTime: null, deadline: null });
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
      fail(`${URL}/1/schedule`, 400, 'Deadline cannot be earlier than due date');

      expect(messageFor('task-deadline')).toBe('Deadline cannot be earlier than due date');
      expect(saveButton().disabled).toBe(false);

      submit();
      http.expectNone(`${URL}/1`);
      expect(http.expectOne(`${URL}/1/schedule`).request.body).toEqual({ deadline: '2026-10-09' });
    });

    it('keeps the due date of a repeating task', async () => {
      await open({ ...STUDY, isRecurring: true });
      expect(text('.hint')).toBe('This task repeats, so it needs a due date.');

      type('task-due-date', '');
      type('task-due-time', '');

      expect(messageFor('task-due-date')).toBe('Repeating tasks need a due date.');
      submit();
      http.expectNone(`${URL}/1/schedule`);
    });

    it('shows "Task not found" and refreshes the list when the save returns 404', async () => {
      await open();
      type('task-title', 'Study module 5');
      submit();
      fail(`${URL}/1`, 404, 'Invalid updating task.');

      expect(text('.form-error')).toBe('Task not found.');
      http.expectOne(`${URL}?projectId=10`).flush([]);
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
      http.expectOne(`${URL}/1`).flush(STUDY);
      harness.detectChanges();

      expect(value('task-title')).toBe('Study ILT Module 4');
    });
  });
});
