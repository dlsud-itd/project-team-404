import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../../environments/environment';
import type { ApiProject, Project } from '../../../projects/shared/types/project.types';
import { asApiTask } from '../../shared/testing/api-task';
import { AppShell } from '../../../../shared/components/app-shell/app-shell';
import type { Task } from '../../shared/types/task.types';
import { TaskList } from './task-list';

const TASKS_URL = `${environment.apiBaseUrl}/api/tasks`;
const PROJECTS_URL = `${environment.apiBaseUrl}/api/projects`;

/** Projects as the API sends them: `id` instead of `projectId`. */
const asApi = ({ projectId, ...rest }: Project): ApiProject => ({ id: projectId, ...rest });
const LIST_URL = `${TASKS_URL}?projectId=10&status=all&pageSize=100`;

const CAPSTONE: Project = {
  projectId: 10,
  name: 'Capstone',
  description: 'Final requirements',
  color: null,
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
};
const base: Task = {
  taskId: 1,
  projectId: 10,
  priorityId: 3,
  title: 'Write chapter 1',
  description: null,
  dueDate: null,
  deadline: null,
  recurrence: 'none',
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [],
};
const CHAPTER = base;
const OUTLINE: Task = { ...base, taskId: 2, title: 'Outline' };
const PROPOSAL: Task = {
  ...base,
  taskId: 3,
  title: 'Proposal',
  completedAt: '2026-10-01T10:00:00Z',
};

describe('TaskList', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) =>
    page().querySelector(selector) as T | null;
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';
  const titles = (scope = '') =>
    [...page().querySelectorAll(`${scope} app-task-item .title`)].map((n) => n.textContent?.trim());

  async function open(url = '/projects/10/tasks'): Promise<void> {
    await harness.navigateByUrl(url);
  }

  function loadWith(tasks: Task[], project: Project | null = CAPSTONE): void {
    if (project) http.expectOne(`${PROJECTS_URL}/${project.projectId}`).flush(asApi(project));
    http.expectOne(LIST_URL).flush(tasks.map(asApiTask));
    harness.detectChanges();
  }

  function askToDelete(title: string): void {
    el<HTMLButtonElement>(`button[aria-label="Delete ${title}"]`)!.click();
    harness.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        // The popup lives in the top bar, so the list runs inside the shell as it does for real.
        provideRouter([
          {
            path: 'projects/:projectId/tasks',
            component: AppShell,
            children: [{ path: '', component: TaskList }],
          },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  it('shows a loading state until the list arrives', async () => {
    await open();
    expect(text('[role="status"]')).toBe('Loading tasks…');

    loadWith([CHAPTER]);

    expect(el('.status')).toBeNull();
  });

  it('shows the project name and description as the heading', async () => {
    await open();
    loadWith([]);

    expect(text('h1')).toBe('Capstone');
    expect(text('.subtitle')).toBe('Final requirements');
  });

  it('lists open tasks by id, with completed tasks in their own section', async () => {
    await open();
    loadWith([OUTLINE, PROPOSAL, CHAPTER]);

    expect(titles('[aria-labelledby="open-heading"]')).toEqual(['Write chapter 1', 'Outline']);
    expect(titles('[aria-labelledby="completed-heading"]')).toEqual(['Proposal']);
    expect(text('#open-heading')).toBe('To do · 2');
  });

  describe('new task popup', () => {
    async function openPopup(selector = '.title-row button.new'): Promise<void> {
      el<HTMLButtonElement>(selector)!.click();
      harness.detectChanges();
      // The form's project picker loads the projects.
      http.expectOne(PROJECTS_URL).flush([asApi(CAPSTONE)]);
      await harness.fixture.whenStable();
      harness.detectChanges();
    }

    function add(title: string): void {
      const input = el<HTMLInputElement>('#task-title')!;
      input.value = title;
      input.dispatchEvent(new Event('input'));
      el('.dialog form')!.dispatchEvent(new Event('submit'));
      harness.detectChanges();
    }

    it('opens over the list with this project picked', async () => {
      await open();
      loadWith([CHAPTER]);
      expect(el('[role="dialog"]')).toBeNull();

      await openPopup();

      expect(el('[role="dialog"]')).toBeTruthy();
      expect(titles()).toEqual(['Write chapter 1']);
      expect(el<HTMLSelectElement>('#task-project')!.selectedOptions[0].textContent).toContain(
        'Capstone',
      );
    });

    it('adds the task to the list without a reload', async () => {
      await open();
      loadWith([CHAPTER]);
      await openPopup();

      add('Outline');
      http.expectOne(TASKS_URL).flush(asApiTask(OUTLINE));
      harness.detectChanges();

      expect(el('[role="dialog"]')).toBeNull();
      expect(titles()).toEqual(['Write chapter 1', 'Outline']);
    });

    it('moves to the other project when the task was added there', async () => {
      const GYM = { ...CAPSTONE, projectId: 11, name: 'Gym' };
      await open();
      loadWith([CHAPTER]);
      await openPopup();

      add('Outline');
      http.expectOne(TASKS_URL).flush(asApiTask({ ...OUTLINE, projectId: 11 }));
      await harness.fixture.whenStable();
      http.expectOne(`${PROJECTS_URL}/11`).flush(asApi(GYM));
      http
        .expectOne(`${TASKS_URL}?projectId=11&status=all&pageSize=100`)
        .flush([asApiTask({ ...OUTLINE, projectId: 11 })]);
      harness.detectChanges();

      expect(text('h1')).toBe('Gym');
      expect(titles()).toEqual(['Outline']);
    });
  });

  it('invites the user to add a task when the project has none', async () => {
    await open();
    loadWith([]);

    expect(text('.empty-title')).toBe('No tasks here yet.');

    el<HTMLButtonElement>('.empty button.new')!.click();
    harness.detectChanges();
    http.expectOne(PROJECTS_URL).flush([asApi(CAPSTONE)]);

    expect(el('[role="dialog"]')).toBeTruthy();
  });

  it('shows an error with a retry action when the list fails', async () => {
    await open();
    http.expectOne(`${PROJECTS_URL}/10`).flush(asApi(CAPSTONE));
    http.expectOne(LIST_URL).flush(null, { status: 500, statusText: 'Server Error' });
    harness.detectChanges();

    expect(text('.load-error p')).toContain('Something went wrong. Please try again.');

    el<HTMLButtonElement>('button.retry')!.click();
    http.expectOne(LIST_URL).flush([asApiTask(CHAPTER)]);
    harness.detectChanges();

    expect(el('.load-error')).toBeNull();
    expect(titles()).toEqual(['Write chapter 1']);
  });

  it('says the project was not found when it does not exist', async () => {
    await open('/projects/99/tasks');
    http
      .expectOne(`${PROJECTS_URL}/99`)
      .flush({ error: 'Project not found' }, { status: 404, statusText: 'Not Found' });
    http.expectOne(`${TASKS_URL}?projectId=99&status=all&pageSize=100`).flush([]);
    harness.detectChanges();

    expect(text('.message p')).toBe('Project not found.');
    expect(el('button.new')).toBeNull();
  });

  it('treats a non-numeric project id as not found without a request', async () => {
    await open('/projects/abc/tasks');

    expect(text('.message p')).toBe('Project not found.');
  });

  describe('deleting', () => {
    beforeEach(async () => {
      await open();
      loadWith([OUTLINE, CHAPTER]);
    });

    it('asks for confirmation and makes no request when cancelled', () => {
      askToDelete('Outline');
      expect(text('#delete-title')).toBe('Delete “Outline”?');

      el<HTMLButtonElement>('button.cancel')!.click();
      harness.detectChanges();

      expect(el('app-confirm-delete-task-dialog')).toBeNull();
      http.expectNone(`${TASKS_URL}/2`);
    });

    it('deletes once, removes the task and confirms it', () => {
      askToDelete('Outline');
      el<HTMLButtonElement>('button.confirm')!.click();
      harness.detectChanges();

      expect(el<HTMLButtonElement>('button.confirm')!.disabled).toBe(true);
      el<HTMLButtonElement>('button.confirm')!.click();

      const req = http.expectOne(`${TASKS_URL}/2`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Task deleted successfully' });
      harness.detectChanges();

      expect(el('app-confirm-delete-task-dialog')).toBeNull();
      expect(text('.form-notice')).toBe('“Outline” was deleted.');
      expect(titles()).toEqual(['Write chapter 1']);
    });

    it('keeps the task and shows the error in the dialog when the delete fails', () => {
      askToDelete('Outline');
      el<HTMLButtonElement>('button.confirm')!.click();
      http.expectOne(`${TASKS_URL}/2`).flush(null, { status: 500, statusText: 'Server Error' });
      harness.detectChanges();

      expect(text('.dialog [role="alert"]')).toBe('Something went wrong. Please try again.');
      expect(el<HTMLButtonElement>('button.confirm')!.disabled).toBe(false);
      expect(titles()).toEqual(['Write chapter 1', 'Outline']);
    });

    it('closes the dialog and reloads the list when the task is already gone', () => {
      askToDelete('Outline');
      el<HTMLButtonElement>('button.confirm')!.click();
      http
        .expectOne(`${TASKS_URL}/2`)
        .flush({ error: 'Invalid deleting task.' }, { status: 404, statusText: 'Not Found' });
      harness.detectChanges();

      expect(el('app-confirm-delete-task-dialog')).toBeNull();
      expect(text('.banner-error')).toBe('Task not found.');
      http.expectOne(LIST_URL).flush([asApiTask(CHAPTER)]);
      harness.detectChanges();
      expect(titles()).toEqual(['Write chapter 1']);
    });
  });
});
