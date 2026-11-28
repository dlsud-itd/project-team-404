import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../../environments/environment';
import type { ApiProject, Project } from '../../../projects/shared/types/project.types';
import { asApiTask } from '../../shared/testing/api-task';
import { AppShell } from '../../../../shared/components/app-shell/app-shell';
import type { Task } from '../../shared/types/task.types';
import { TASK_QUERY_DEBOUNCE_MS } from '../../task-organization/state/task-query.store';
import { instantToDate, userTimeZone } from '../../task-scheduling/utils/date-format.util';
import { taskViewStorageKey } from '../../task-views/task-views.store';
import { TaskList } from './task-list';

const TASKS_URL = `${environment.apiBaseUrl}/api/tasks`;
const PROJECTS_URL = `${environment.apiBaseUrl}/api/projects`;
const LABELS_URL = `${environment.apiBaseUrl}/api/labels`;

/** Projects as the API sends them: `id` instead of `projectId`. */
const asApi = ({ projectId, ...rest }: Project): ApiProject => ({ id: projectId, ...rest });
const POSITION_ORDER = 'orderBy=position&orderDirection=asc';
const LIST_URL = `${TASKS_URL}?projectId=10&status=all&pageSize=100&${POSITION_ORDER}`;

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
  scheduledDate: null,
  dueDate: null,
  recurrence: 'none',
  recurrenceDays: [],
  recurrenceEndDate: null,
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

  async function open(
    url = '/projects/10/tasks',
    labels: { id: number; name: string; color: string | null }[] = [],
  ): Promise<void> {
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
    http.match(LABELS_URL).forEach((req) => req.flush(labels));
  }

  function loadWith(tasks: Task[], project: Project | null = CAPSTONE): void {
    if (project) http.expectOne(`${PROJECTS_URL}/${project.projectId}`).flush(asApi(project));
    http.expectOne(LIST_URL).flush(tasks.map(asApiTask));
    harness.detectChanges();
  }

  /** The filter chip whose text starts with `name`, e.g. "Priority". */
  const chip = (name: string) =>
    [...page().querySelectorAll<HTMLButtonElement>('app-task-filter-bar .chip')].find((c) =>
      c.textContent?.trim().startsWith(name),
    )!;
  const chipText = (name: string) => chip(name).textContent?.trim().replace(/\s+/g, ' ');

  /** Opens a chip's panel and clicks the option with this text. */
  async function pick(chipName: string, option: string): Promise<void> {
    if (chip(chipName).getAttribute('aria-expanded') !== 'true') chip(chipName).click();
    harness.detectChanges();
    const input = [...page().querySelectorAll('.panel .option')]
      .find((o) => o.textContent?.trim() === option)
      ?.querySelector('input');
    expect(input, `option ${option}`).toBeTruthy();
    input!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  /** Opens the sort menu and picks a field; the menu renders in the CDK overlay. */
  async function sortBy(label: string): Promise<void> {
    el<HTMLButtonElement>('app-sort-menu .trigger')!.click();
    harness.detectChanges();
    const item = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')].find(
      (i) => i.textContent?.trim() === label,
    );
    expect(item, `sort option ${label}`).toBeTruthy();
    item!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  /**
   * With no sort picked, the list asks for the project's own (drag-and-drop) order. The board's
   * paged detail requests (`page=`) keep their own order, so they don't.
   */
  const listUrl = (params = '') =>
    `${TASKS_URL}?projectId=10&status=all&pageSize=100${params ? `&${params}` : ''}${
      params.includes('orderBy=') || params.includes('page=') ? '' : `&${POSITION_ORDER}`
    }`;

  /** Opening a project stamps it for the dashboard's "Recently accessed" sort. */
  function flushAccess(): void {
    for (const req of http.match((r) => r.url.endsWith('/access'))) req.flush({});
  }

  beforeEach(async () => {
    // Each project remembers its last view; start every test on the default list.
    localStorage.clear();
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
        // Filter changes reload at once instead of after a pause.
        { provide: TASK_QUERY_DEBOUNCE_MS, useValue: 0 },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    flushAccess();
    http.verify();
  });

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

  it('lists open tasks in the project order the server sends, with completed tasks in their own section', async () => {
    await open();
    loadWith([OUTLINE, PROPOSAL, CHAPTER]);

    expect(titles('[aria-labelledby="open-heading"]')).toEqual(['Outline', 'Write chapter 1']);
    expect(titles('[aria-labelledby="completed-heading"]')).toEqual(['Proposal']);
    expect(text('#open-heading')).toBe('To do · 2');
  });

  it('filters by several priorities and a label, sorts, and keeps it all in the URL', async () => {
    await open('/projects/10/tasks', [{ id: 7, name: 'Study', color: null }]);
    loadWith([CHAPTER]);

    await pick('Priority', 'High');
    // One built-in level still uses the Sprint 3 filter.
    http.expectOne(listUrl('priority=high')).flush([asApiTask(CHAPTER)]);
    await pick('Priority', 'Medium');
    http.expectOne(listUrl('priorities=high,medium')).flush([asApiTask(CHAPTER)]);
    expect(chipText('Priority')).toBe('Priority: High, Medium');

    await pick('Labels', 'Study');
    http
      .expectOne(listUrl('priorities=high,medium&labelId=7'))
      .flush([asApiTask({ ...CHAPTER, labels: [{ labelId: 7, name: 'Study', color: null }] })]);

    await sortBy('Title');
    http
      .expectOne(listUrl('priorities=high,medium&labelId=7&orderBy=title&orderDirection=asc'))
      .flush([asApiTask({ ...CHAPTER, taskId: 2, title: 'A task' }), asApiTask(CHAPTER)]);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(titles()).toEqual(['A task', 'Write chapter 1']);
    expect(text('app-sort-menu .trigger')).toContain('Title');
    expect(text('app-task-filter-bar .count')).toBe('2 filters');
    const url = TestBed.inject(Router).url;
    expect(url).toContain('priorities=high,medium');
    expect(url).toContain('labelIds=7');
    expect(url).toContain('orderBy=title');
  });

  it('restores Sprint 3 filter links and sends them on the first list request', async () => {
    await open('/projects/10/tasks?priority=high&labelId=7&orderBy=title&orderDirection=desc', [
      { id: 7, name: 'Study', color: null },
    ]);
    http.expectOne(`${PROJECTS_URL}/10`).flush(asApi(CAPSTONE));
    http
      .expectOne(listUrl('priority=high&labelId=7&orderBy=title&orderDirection=desc'))
      .flush([asApiTask({ ...CHAPTER, labels: [{ labelId: 7, name: 'Study', color: null }] })]);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(chipText('Priority')).toBe('Priority: High');
    expect(chipText('Labels')).toBe('Labels: Study');
    expect(text('app-sort-menu .trigger')).toContain('Title');
    expect(el('app-sort-menu .direction')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('filters by due date, repeat and status, and drops Overdue when Completed is picked', async () => {
    await open();
    loadWith([CHAPTER]);
    const today = instantToDate(new Date().toISOString(), userTimeZone());

    await pick('Due', 'Today');
    http.expectOne(listUrl(`dueFrom=${today}&dueTo=${today}`)).flush([]);
    await pick('Due', 'Overdue');
    http.expectOne(listUrl('overdue=true')).flush([]);
    await pick('Repeat', 'Repeating');
    http.expectOne(listUrl('overdue=true&recurring=true')).flush([]);

    // The server refuses overdue together with completed; the newest choice wins.
    await pick('Status', 'Completed');
    http
      .expectOne(
        `${TASKS_URL}?projectId=10&status=completed&pageSize=100&recurring=true&${POSITION_ORDER}`,
      )
      .flush([]);
    expect(chipText('Due')).toBe('Due');
  });

  it('offers to clear the filters when nothing matches them', async () => {
    await open('/projects/10/tasks?status=completed');
    http.expectOne(`${PROJECTS_URL}/10`).flush(asApi(CAPSTONE));
    http
      .expectOne(`${TASKS_URL}?projectId=10&status=completed&pageSize=100&${POSITION_ORDER}`)
      .flush([]);
    harness.detectChanges();

    expect(text('.empty-title')).toBe('No tasks match these filters.');
    expect(text('app-task-filter-bar .count')).toBe('1 filter');
    expect(text('app-task-filter-bar [aria-live]')).toBe('1 filter applied');

    el<HTMLButtonElement>('.empty button.new')!.click();
    await harness.fixture.whenStable();
    http.expectOne(LIST_URL).flush([asApiTask(CHAPTER)]);
    harness.detectChanges();

    expect(titles()).toEqual(['Write chapter 1']);
    expect(el('app-task-filter-bar .count')).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/projects/10/tasks');
  });

  it('closes a filter panel with Escape and returns focus to its chip', async () => {
    await open();
    loadWith([CHAPTER]);

    chip('Status').click();
    harness.detectChanges();
    expect(chip('Status').getAttribute('aria-expanded')).toBe('true');
    const option = el<HTMLInputElement>('#task-filter-status input')!;
    option.focus();

    option.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    harness.detectChanges();

    expect(el('#task-filter-status')).toBeNull();
    expect(chip('Status').getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(chip('Status'));
  });

  describe('new task popup', () => {
    async function openPopup(selector = '.title-row button.new'): Promise<void> {
      el<HTMLButtonElement>(selector)!.click();
      harness.detectChanges();
      // The form's project picker loads the projects.
      http.expectOne(`${PROJECTS_URL}?isArchived=false`).flush([asApi(CAPSTONE)]);
      http.expectOne(`${PROJECTS_URL}?isArchived=true`).flush([]);
      http.expectOne(LABELS_URL).flush([]);
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
        .expectOne(`${TASKS_URL}?projectId=11&status=all&pageSize=100&${POSITION_ORDER}`)
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
    http.expectOne(`${PROJECTS_URL}?isArchived=false`).flush([asApi(CAPSTONE)]);
    http.expectOne(`${PROJECTS_URL}?isArchived=true`).flush([]);
    http.expectOne(LABELS_URL).flush([]);

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
    http.expectOne(`${TASKS_URL}?projectId=99&status=all&pageSize=100&${POSITION_ORDER}`).flush([]);
    harness.detectChanges();

    expect(text('.message p')).toBe('Project not found.');
    expect(el('button.new')).toBeNull();
  });

  it('treats a non-numeric project id as not found without a request', async () => {
    await open('/projects/abc/tasks');

    expect(text('.message p')).toBe('Project not found.');
  });

  describe('archive instead of delete', () => {
    beforeEach(async () => {
      await open();
      loadWith([OUTLINE, CHAPTER]);
    });

    it('records that the project was opened', () => {
      const access = http.match(
        (r) => r.url === `${environment.apiBaseUrl}/api/projects/10/access`,
      );
      expect(access).toHaveLength(1);
      expect(access[0].request.method).toBe('PUT');
      access[0].flush({ projectId: 10, lastAccessedAt: '2026-11-27T00:00:00Z' });
    });

    it('has no Delete buttons, only Archive', () => {
      expect(el('button[aria-label^="Delete"]')).toBeNull();
      expect(el('button[aria-label="Archive task Outline"]')).toBeTruthy();
    });

    it('archives a task, hiding it at once', () => {
      el<HTMLButtonElement>('button[aria-label="Archive task Outline"]')!.click();
      harness.detectChanges();

      const req = http.expectOne(`${TASKS_URL}/2/archive`);
      expect(req.request.body).toEqual({ isArchived: true });
      req.flush({ taskId: 2, isArchived: true, archivedAt: '2026-11-27T00:00:00Z' });
      harness.detectChanges();
      expect(titles()).toEqual(['Write chapter 1']);
    });
  });

  describe('board view', () => {
    const BOARD_URL = `${TASKS_URL}/board`;

    it('switches between list and board, keeping the filters', async () => {
      await open('/projects/10/tasks?recurring=true');
      http.expectOne(`${PROJECTS_URL}/10`).flush(asApi(CAPSTONE));
      http.expectOne(listUrl('recurring=true')).flush([asApiTask(CHAPTER)]);
      harness.detectChanges();

      const views = () => [
        ...page().querySelectorAll<HTMLAnchorElement>('app-view-switcher .view'),
      ];
      expect(views().map((v) => [v.textContent?.trim(), v.getAttribute('aria-current')])).toEqual([
        ['List', 'page'],
        ['Table', null],
        ['Board', null],
        ['Timeline', null],
      ]);
      expect(el('app-sort-menu')).not.toBeNull();

      views()[2].click();
      await harness.fixture.whenStable();
      harness.detectChanges();

      expect(TestBed.inject(Router).url).toBe('/projects/10/tasks?recurring=true&view=board');
      expect(el('app-sort-menu')).toBeNull();
      expect(el('app-task-filter-bar')).not.toBeNull();
      // The board loads itself with the same filters; the list is not asked again.
      http.expectOne(`${BOARD_URL}?projectId=10&recurring=true`).flush({
        projectId: 10,
        columns: { todo: [], inProgress: [], done: [] },
        counts: { todo: 0, inProgress: 0, done: 0 },
      });
      http.expectOne(listUrl('recurring=true&page=1')).flush([]);
      harness.detectChanges();
      expect(text('app-board-view .empty-title')).toBe('No tasks match these filters.');
    });

    it('opens on the board from a link', async () => {
      await open('/projects/10/tasks?view=board');
      http.expectOne(`${PROJECTS_URL}/10`).flush(asApi(CAPSTONE));
      http.expectOne(`${BOARD_URL}?projectId=10`).flush({
        projectId: 10,
        columns: {
          todo: [
            {
              id: 1,
              title: 'Write chapter 1',
              boardStatus: 'todo',
              isDone: false,
              position: 0,
              doneAt: null,
            },
          ],
          inProgress: [],
          done: [],
        },
        counts: { todo: 1, inProgress: 0, done: 0 },
      });
      http.expectOne(listUrl('page=1')).flush([asApiTask(CHAPTER)]);
      harness.detectChanges();

      expect(el('.page')!.classList).toContain('wide');
      expect(text('app-board-column .open')).toBe('Write chapter 1');
      expect(el('app-task-item')).toBeNull();
    });
  });

  describe('timeline view', () => {
    it("opens on the project's timeline from a link, with its filters and no sort", async () => {
      await open('/projects/10/tasks?view=timeline&recurring=true');
      http.expectOne(`${PROJECTS_URL}/10`).flush(asApi(CAPSTONE));
      const request = http.expectOne((r) => r.url === `${TASKS_URL}/timeline`);
      const params = request.request.params;
      expect(params.get('projectId')).toBe('10');
      expect(params.get('recurring')).toBe('true');
      expect(params.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      request.flush({
        from: params.get('from'),
        to: params.get('to'),
        projects: [
          {
            projectId: 10,
            projectName: 'Capstone',
            projectColor: null,
            bars: [
              {
                id: 1,
                title: 'Write chapter 1',
                projectId: 10,
                projectName: 'Capstone',
                projectColor: null,
                start: params.get('from'),
                end: params.get('from'),
                isDone: false,
                isOverdue: false,
                priority: 'medium',
              },
            ],
          },
        ],
        undatedCount: 0,
      });
      harness.detectChanges();

      expect(el('.page')!.classList).toContain('wide');
      expect(el('app-sort-menu')).toBeNull();
      expect(el('app-timeline-bar .title')?.textContent?.trim()).toBe('Write chapter 1');
      expect(el('app-timeline-bar .check')?.getAttribute('role')).toBe('checkbox');
      expect(el('app-task-item')).toBeNull();
    });
  });

  describe('table view', () => {
    const rowTitles = () =>
      [...page().querySelectorAll('app-table-view tbody .title')].map((n) => n.textContent?.trim());

    it('switches from the list to the table without asking the server again', async () => {
      await open('/projects/10/tasks?status=active');
      http.expectOne(`${PROJECTS_URL}/10`).flush(asApi(CAPSTONE));
      http
        .expectOne(`${TASKS_URL}?projectId=10&status=active&pageSize=100&${POSITION_ORDER}`)
        .flush([asApiTask(CHAPTER), asApiTask(OUTLINE)]);
      harness.detectChanges();

      el<HTMLAnchorElement>('app-view-switcher a[href*="view=table"]')!.click();
      await harness.fixture.whenStable();
      harness.detectChanges();

      expect(TestBed.inject(Router).url).toBe('/projects/10/tasks?status=active&view=table');
      expect(rowTitles()).toEqual(['Write chapter 1', 'Outline']);
      expect(el('app-task-item')).toBeNull();
      // The filter bar and sort stay above the table.
      expect(el('app-task-filter-bar')).not.toBeNull();
      expect(el('app-sort-menu')).not.toBeNull();
      expect(el('.page')!.classList).toContain('wide');
    });

    it('sorts from a header through the URL and reloads in that order', async () => {
      await open('/projects/10/tasks?view=table');
      loadWith([CHAPTER, OUTLINE]);

      el<HTMLButtonElement>('app-table-view th.col-title button')!.click();
      await harness.fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/projects/10/tasks?view=table&orderBy=title');
      http
        .expectOne(listUrl('orderBy=title&orderDirection=asc'))
        .flush([asApiTask(OUTLINE), asApiTask(CHAPTER)]);
      harness.detectChanges();

      expect(rowTitles()).toEqual(['Outline', 'Write chapter 1']);
      expect(el('app-table-view th.col-title')!.getAttribute('aria-sort')).toBe('ascending');
    });

    it('remembers the view for the project', async () => {
      await open('/projects/10/tasks?view=table');
      loadWith([CHAPTER]);

      expect(localStorage.getItem(taskViewStorageKey(10))).toBe('table');
    });

    it('opens a project on the view last used there', async () => {
      localStorage.setItem(taskViewStorageKey(10), 'table');

      await open('/projects/10/tasks');
      loadWith([CHAPTER]);

      expect(TestBed.inject(Router).url).toBe('/projects/10/tasks');
      expect(rowTitles()).toEqual(['Write chapter 1']);
      const current = el('app-view-switcher [aria-current="page"]');
      expect(current?.textContent?.trim()).toBe('Table');
    });

    it('shows the same empty state as the list', async () => {
      await open('/projects/10/tasks?view=table&status=completed');
      http.expectOne(`${PROJECTS_URL}/10`).flush(asApi(CAPSTONE));
      http
        .expectOne(`${TASKS_URL}?projectId=10&status=completed&pageSize=100&${POSITION_ORDER}`)
        .flush([]);
      harness.detectChanges();

      expect(el('app-table-view')).toBeNull();
      expect(text('.empty-title')).toBe('No tasks match these filters.');
    });
  });

  describe('reordering', () => {
    it('saves the new order when a task is moved down', async () => {
      await open();
      loadWith([CHAPTER, { ...OUTLINE, sortOrder: 1 }]);

      el<HTMLButtonElement>('button[aria-label="Move Write chapter 1 down"]')!.click();
      harness.detectChanges();

      const req = http.expectOne(`${TASKS_URL}/reorder`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ projectId: 10, taskIds: [2, 1] });
      req.flush({});
      harness.detectChanges();

      expect(titles()).toEqual(['Outline', 'Write chapter 1']);
    });

    it('turns reordering off while filtered, saying why', async () => {
      await open('/projects/10/tasks?recurring=false');
      http.expectOne(`${PROJECTS_URL}/10`).flush(asApi(CAPSTONE));
      http
        .expectOne(listUrl('recurring=false'))
        .flush([asApiTask(CHAPTER), asApiTask({ ...OUTLINE, sortOrder: 1 })]);
      harness.detectChanges();

      expect(text('#reorder-hint')).toBe('Clear the filters to reorder tasks.');
      expect(
        el<HTMLButtonElement>('button[aria-label="Move Write chapter 1 down"]')!.disabled,
      ).toBe(true);
      expect(el('.handle')).toBeNull();
    });
  });
});
