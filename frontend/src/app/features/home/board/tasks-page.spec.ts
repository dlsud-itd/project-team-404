import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiProject } from '../../projects/testing/helpers/api-project';
import type { Project } from '../../projects/shared/types/project.types';
import { asApiTask } from '../../tasks/shared/testing/api-task';
import { TasksStore } from '../../tasks/shared/state/tasks.store';
import type { Task } from '../../tasks/shared/types/task.types';
import { TASK_QUERY_DEBOUNCE_MS } from '../../tasks/task-organization/state/task-query.store';
import { TasksPage } from './tasks-page';

const PROJECTS_URL = `${environment.apiBaseUrl}/api/projects`;
const TASKS_URL = `${environment.apiBaseUrl}/api/tasks`;
const LIST_URL = `${TASKS_URL}?status=all&pageSize=100&page=1`;
const LABELS_URL = `${environment.apiBaseUrl}/api/labels`;
const INBOX: Project = {
  projectId: 1,
  name: 'Inbox',
  description: null,
  color: null,
  isInbox: true,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
};
const DESIGN: Project = {
  projectId: 2,
  name: 'Design',
  description: null,
  color: '#2563EB',
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 1,
};
const TASK: Task = {
  taskId: 10,
  projectId: DESIGN.projectId,
  priorityId: 1,
  title: 'Review actual project work',
  description: null,
  scheduledDate: null,
  dueDate: '2026-10-02',
  deadline: null,
  recurrence: 'none',
  recurrenceDays: [],
  recurrenceEndDate: null,
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [],
};

describe('TasksPage', () => {
  let fixture: ComponentFixture<TasksPage>;
  let http: HttpTestingController;

  const element = <T extends HTMLElement>(selector: string) =>
    fixture.nativeElement.querySelector(selector) as T | null;

  function load(tasks: Task[] = [TASK]): void {
    http
      .expectOne(`${PROJECTS_URL}?isArchived=false`)
      .flush([apiProject(INBOX), apiProject(DESIGN)]);
    http.expectOne(`${PROJECTS_URL}?isArchived=true`).flush([]);
    http.expectOne(LIST_URL).flush(tasks.map(asApiTask));
    // The filter bar's label choices.
    http.expectOne(LABELS_URL).flush([]);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TasksPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TasksPage);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads real projects and tasks from their APIs', () => {
    load();

    expect(element('li.task .title')?.textContent).toContain(TASK.title);
    expect(element('li.task .project')?.textContent).toContain('Design');
    expect(element<HTMLElement>('li.task .swatch')?.style.background).toBe('rgb(37, 99, 235)');
    expect(element('li.task .priority')?.textContent).toContain('High');
  });

  it('completes a task through the task update API', () => {
    load();
    const checkbox = element<HTMLInputElement>('input[type="checkbox"]')!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    const request = http.expectOne(`${TASKS_URL}/${TASK.taskId}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({
      isDone: true,
      doneAt: expect.any(String),
    });
    request.flush({ taskId: TASK.taskId, message: 'Task updated successfully' });
    fixture.detectChanges();

    expect(element<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
    expect(element('li.task')?.classList.contains('done')).toBe(true);
  });

  it('opens the new-task dialog for the Inbox project', () => {
    load([]);
    element<HTMLButtonElement>('.new')!.click();
    fixture.detectChanges();
    http.expectOne(LABELS_URL).flush([]);

    expect(TestBed.inject(TasksStore).creating()).toEqual({ projectId: INBOX.projectId });
  });

  it('deletes a task through the confirmation dialog and API', () => {
    load();
    element<HTMLButtonElement>('.delete')!.click();
    fixture.detectChanges();
    element<HTMLButtonElement>('.confirm')!.click();

    const request = http.expectOne(`${TASKS_URL}/${TASK.taskId}`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ message: 'Task deleted successfully' });
    fixture.detectChanges();

    expect(element('li.task')).toBeNull();
  });
});

describe('TasksPage filters and sort', () => {
  let fixture: ComponentFixture<TasksPage>;
  let http: HttpTestingController;
  let router: Router;

  const page = () => fixture.nativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) =>
    page().querySelector(selector) as T | null;
  const titles = () =>
    [...page().querySelectorAll('.task .title')].map((t) => t.textContent?.trim());
  const listUrl = (params = '') =>
    `${TASKS_URL}?status=all&pageSize=100${params ? `&${params}` : ''}&page=1`;

  /** Opens the tab at this URL and answers its first requests. */
  async function open(url: string, list: string, tasks: Task[] = [TASK]): Promise<void> {
    await router.navigateByUrl(url);
    fixture = TestBed.createComponent(TasksPage);
    fixture.detectChanges();
    http
      .expectOne(`${PROJECTS_URL}?isArchived=false`)
      .flush([apiProject(INBOX), apiProject(DESIGN)]);
    http.expectOne(`${PROJECTS_URL}?isArchived=true`).flush([]);
    http.expectOne(list).flush(tasks.map(asApiTask));
    http.expectOne(LABELS_URL).flush([{ id: 7, name: 'Study', color: null }]);
    fixture.detectChanges();
  }

  /** Opens a filter chip and clicks one of its options. */
  async function pick(chipName: string, option: string): Promise<void> {
    const chip = [...page().querySelectorAll<HTMLButtonElement>('app-task-filter-bar .chip')].find(
      (c) => c.textContent?.trim().startsWith(chipName),
    )!;
    chip.click();
    fixture.detectChanges();
    const input = [...page().querySelectorAll('.panel .option')]
      .find((o) => o.textContent?.trim() === option)
      ?.querySelector('input');
    expect(input, `option ${option}`).toBeTruthy();
    input!.click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TasksPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TASK_QUERY_DEBOUNCE_MS, useValue: 0 },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  it('reloads with the picked filters and keeps them in the URL next to the tab', async () => {
    await open('/?tab=tasks', listUrl());

    await pick('Priority', 'High');
    http.expectOne(listUrl('priority=high')).flush([asApiTask(TASK)]);
    await pick('Status', 'Active');
    http.expectOne(listUrl('priority=high').replace('status=all', 'status=active')).flush([]);
    fixture.detectChanges();

    expect(router.url).toBe('/?tab=tasks&priorities=high&status=active');
    expect(el('app-task-filter-bar .count')?.textContent?.trim()).toBe('2 filters');
  });

  it('restores filters from the URL on the first load', async () => {
    await open('/?tab=tasks&labelIds=7&recurring=false', listUrl('labelId=7&recurring=false'));

    const chips = [...page().querySelectorAll('app-task-filter-bar .chip')].map((c) =>
      c.textContent?.trim().replace(/\s+/g, ' '),
    );
    expect(chips).toContain('Labels: Study');
    expect(chips).toContain('One-time');
  });

  it('keeps the server order when a sort is picked', async () => {
    const LATER = { ...TASK, taskId: 11, title: 'Later task', dueDate: '2026-12-01' };
    await open(
      '/?tab=tasks&orderBy=dueDate&orderDirection=desc',
      listUrl('orderBy=dueDate&orderDirection=desc'),
      [LATER, TASK],
    );

    expect(titles()).toEqual(['Later task', 'Review actual project work']);
    expect(el('app-sort-menu .trigger')?.textContent).toContain('Due date');
  });

  it('offers to clear the filters when nothing matches them', async () => {
    await open(
      '/?tab=tasks&status=completed',
      listUrl().replace('status=all', 'status=completed'),
      [],
    );

    expect(el('.empty-title')?.textContent?.trim()).toBe('No tasks match these filters.');

    el<HTMLButtonElement>('.clear-filters')!.click();
    await fixture.whenStable();
    http.expectOne(listUrl()).flush([asApiTask(TASK)]);
    fixture.detectChanges();

    expect(router.url).toBe('/?tab=tasks');
    expect(titles()).toEqual(['Review actual project work']);
  });
});

describe('TasksPage board view', () => {
  let fixture: ComponentFixture<TasksPage>;
  let http: HttpTestingController;
  let router: Router;

  const BOARD_URL = `${TASKS_URL}/board`;
  const page = () => fixture.nativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) =>
    page().querySelector(selector) as T | null;
  const views = () => [...page().querySelectorAll<HTMLAnchorElement>('app-view-switcher .view')];

  /** Opens the tab at this URL and answers the page's own first requests. */
  async function open(url: string): Promise<void> {
    await router.navigateByUrl(url);
    fixture = TestBed.createComponent(TasksPage);
    fixture.detectChanges();
    http
      .expectOne(`${PROJECTS_URL}?isArchived=false`)
      .flush([apiProject(INBOX), apiProject(DESIGN)]);
    http.expectOne(`${PROJECTS_URL}?isArchived=true`).flush([]);
    http.expectOne(LIST_URL).flush([asApiTask(TASK)]);
    http.expectOne(LABELS_URL).flush([]);
    fixture.detectChanges();
  }

  /** Answers the board's requests for one project. */
  function flushBoard(projectId: number, tasks: Task[]): void {
    http.expectOne(`${BOARD_URL}?projectId=${projectId}`).flush({
      projectId,
      columns: {
        todo: tasks.map((t, position) => ({
          id: t.taskId,
          title: t.title,
          boardStatus: 'todo',
          isDone: false,
          position,
          doneAt: null,
        })),
        inProgress: [],
        done: [],
      },
      counts: { todo: tasks.length, inProgress: 0, done: 0 },
    });
    http
      .expectOne(`${TASKS_URL}?projectId=${projectId}&status=all&pageSize=100&page=1`)
      .flush(tasks.map(asApiTask));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TasksPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TASK_QUERY_DEBOUNCE_MS, useValue: 0 },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  it('offers a List and Board switch that keeps the tab', async () => {
    await open('/?tab=tasks');

    expect(views().map((v) => [v.textContent?.trim(), v.getAttribute('aria-current')])).toEqual([
      ['List', 'page'],
      ['Board', null],
    ]);
    expect(views()[1].getAttribute('href')).toBe('/?tab=tasks&taskView=board');
    expect(el('app-board-view')).toBeNull();
  });

  it('shows the first real project’s board and hides the sort', async () => {
    await open('/?tab=tasks&taskView=board');
    flushBoard(DESIGN.projectId, [TASK]);

    expect(el<HTMLSelectElement>('#board-project')!.value).toBe(String(DESIGN.projectId));
    expect(el('app-board-column .open')?.textContent?.trim()).toBe(TASK.title);
    expect(el('app-sort-menu')).toBeNull();
    expect(el('li.task')).toBeNull();
  });

  it('switches the board to another project through the URL', async () => {
    await open('/?tab=tasks&taskView=board');
    flushBoard(DESIGN.projectId, [TASK]);

    const select = el<HTMLSelectElement>('#board-project')!;
    select.value = String(INBOX.projectId);
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe(`/?tab=tasks&taskView=board&boardProject=${INBOX.projectId}`);
    flushBoard(INBOX.projectId, []);
    expect(el('app-board-view .empty-title')?.textContent?.trim()).toBe('No tasks here yet.');
  });

  it('creates new tasks in the board’s project', async () => {
    await open(`/?tab=tasks&taskView=board&boardProject=${DESIGN.projectId}`);
    flushBoard(DESIGN.projectId, [TASK]);

    el<HTMLButtonElement>('.heading-row .new')!.click();
    fixture.detectChanges();
    http.match(LABELS_URL).forEach((r) => r.flush([]));

    expect(TestBed.inject(TasksStore).creating()).toEqual({ projectId: DESIGN.projectId });
  });
});
