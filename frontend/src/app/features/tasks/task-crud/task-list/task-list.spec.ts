import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../../environments/environment';
import type { Project } from '../../../projects/shared/types/project.types';
import type { Task } from '../../shared/types/task.types';
import { TaskList } from './task-list';

const TASKS_URL = `${environment.apiBaseUrl}/api/tasks`;
const PROJECTS_URL = `${environment.apiBaseUrl}/api/projects`;
const LIST_URL = `${TASKS_URL}?projectId=10`;

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
  priorityId: 4,
  title: 'Write chapter 1',
  description: null,
  dueDate: null,
  dueTime: null,
  deadline: null,
  completedAt: null,
  sortOrder: 1,
  isRecurring: false,
  isArchived: false,
  labels: [],
};
const CHAPTER = base;
const OUTLINE: Task = { ...base, taskId: 2, title: 'Outline', sortOrder: 0 };
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
    if (project) http.expectOne(`${PROJECTS_URL}/${project.projectId}`).flush(project);
    http.expectOne(LIST_URL).flush(tasks);
    harness.detectChanges();
  }

  function askToDelete(title: string): void {
    el<HTMLButtonElement>(`button[aria-label="Delete ${title}"]`)!.click();
    harness.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'projects/:projectId/tasks', component: TaskList }]),
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

  it('lists open tasks by sortOrder, with completed tasks in their own section', async () => {
    await open();
    loadWith([CHAPTER, PROPOSAL, OUTLINE]);

    expect(titles('[aria-labelledby="open-heading"]')).toEqual(['Outline', 'Write chapter 1']);
    expect(titles('[aria-labelledby="completed-heading"]')).toEqual(['Proposal']);
    expect(text('#open-heading')).toBe('To do · 2');
  });

  it('links to the new-task page of this project', async () => {
    await open();
    loadWith([CHAPTER]);

    expect(el('.title-row a.new')?.getAttribute('href')).toBe('/projects/10/tasks/new');
  });

  it('invites the user to add a task when the project has none', async () => {
    await open();
    loadWith([]);

    expect(text('.empty-title')).toBe('No tasks here yet.');
    expect(el('.empty a')?.getAttribute('href')).toBe('/projects/10/tasks/new');
  });

  it('shows an error with a retry action when the list fails', async () => {
    await open();
    http.expectOne(`${PROJECTS_URL}/10`).flush(CAPSTONE);
    http.expectOne(LIST_URL).flush(null, { status: 500, statusText: 'Server Error' });
    harness.detectChanges();

    expect(text('.load-error p')).toContain('Something went wrong. Please try again.');

    el<HTMLButtonElement>('button.retry')!.click();
    http.expectOne(LIST_URL).flush([CHAPTER]);
    harness.detectChanges();

    expect(el('.load-error')).toBeNull();
    expect(titles()).toEqual(['Write chapter 1']);
  });

  it('says the project was not found when it does not exist', async () => {
    await open('/projects/99/tasks');
    http
      .expectOne(`${PROJECTS_URL}/99`)
      .flush({ error: 'Project not found' }, { status: 404, statusText: 'Not Found' });
    http.expectOne(`${TASKS_URL}?projectId=99`).flush([]);
    harness.detectChanges();

    expect(text('.message p')).toBe('Project not found.');
    expect(el('a.new')).toBeNull();
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
      expect(titles()).toEqual(['Outline', 'Write chapter 1']);
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
      http.expectOne(LIST_URL).flush([CHAPTER]);
      harness.detectChanges();
      expect(titles()).toEqual(['Write chapter 1']);
    });
  });
});
