import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../../src/app/app.routes';
import { provideSessionRestore } from '../../../../src/app/features/auth/session/auth.guards';
import { authInterceptor } from '../../../../src/app/features/auth/session/auth.interceptor';
import { TOKEN_STORAGE_KEY } from '../../../../src/app/features/auth/session/token-storage.service';
import {
  apiProjects,
  apiTasks,
  task,
} from '../../../../src/app/features/home/testing/dashboard-fixture';
import { asApiTask } from '../../../../src/app/features/tasks/shared/testing/api-task';
import { environment } from '../../../../src/environments/environment';

const AUTH_API = `${environment.apiBaseUrl}/api/auth`;
const PROJECTS_API = `${environment.apiBaseUrl}/api/projects`;
const TASKS_API = `${environment.apiBaseUrl}/api/tasks`;
const TASKS_LIST = `${TASKS_API}?status=all&pageSize=100&page=1`;
const TOKEN = 'session-token';
const USER = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 4,
};

const at = (hour: number) => new Date(2026, 9, 30, hour, 0, 0);

describe('Home integration (live dashboard APIs)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const text = (selector: string) => el(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const column = (status: string) =>
    all(`section[aria-labelledby="col-${status}"] .task .title`).map((node) =>
      node.textContent?.trim(),
    );
  const allTasks = () => all('app-all-tasks .task .title').map((node) => node.textContent?.trim());
  const stat = (label: string) =>
    all('.stat')
      .find((item) => item.querySelector('dt')?.textContent?.trim() === label)!
      .querySelector('dd')!
      .textContent!.trim();
  const projectRow = (name: string) =>
    all('app-project-list button.row').find(
      (button) => button.querySelector('.name')?.textContent === name,
    )!;
  const priorityRow = (label: string) =>
    all('app-priority-list button.row').find(
      (button) => button.querySelector('.badge')?.textContent === label,
    )!;

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function click(target: HTMLElement): Promise<void> {
    target.click();
    await settle();
  }

  function configure(): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideSessionRestore(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  }

  async function openHome(hour = 9): Promise<void> {
    vi.setSystemTime(at(hour));
    localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    configure();
    harness = await RouterTestingHarness.create();
    http.expectOne(`${AUTH_API}/me`).flush(USER);
    await harness.navigateByUrl('/home');
    await settle();
    const projectRequest = http.expectOne(PROJECTS_API);
    expect(projectRequest.request.method).toBe('GET');
    projectRequest.flush(apiProjects());
    const taskRequest = http.expectOne(TASKS_LIST);
    expect(taskRequest.request.method).toBe('GET');
    taskRequest.flush(apiTasks());
    await settle();
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('redirects signed-out users from the dashboard', async () => {
    configure();
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/home');
    await settle();

    expect(router.url).toBe('/login');
  });

  it.each([
    [9, 'Good Morning'],
    [14, 'Good Afternoon'],
    [20, 'Good Evening'],
  ])('greets the signed-in user at %i:00', async (hour, greeting) => {
    await openHome(hour);

    expect(text('h1.greeting')).toBe(`${greeting}, james`);
    expect(text('button.avatar [aria-hidden="true"]')).toBe('J');
  });

  it('shows backend task counts and the overdue summary', async () => {
    await openHome();

    expect(text('.overdue-note')).toBe('You have 2 overdue tasks.');
    expect(stat('Open tasks')).toBe('8');
    expect(stat('Done today')).toBe('1');
    expect(el('app-mini-calendar [aria-current="date"]')?.textContent?.trim()).toBe('30');
    expect(projectRow('School').querySelector('.count')?.textContent?.trim()).toBe('3');
  });

  it('groups returned tasks into the correct due-date columns', async () => {
    await openHome();

    expect(column('overdue')).toEqual(['Submit lab report', 'Reply to client email']);
    expect(column('current')).toEqual(['Read chapter 4', 'Team stand-up notes']);
    expect(column('upcoming')).toEqual([
      'Study for quiz',
      'Prepare sprint demo',
      'Call grandma',
      'Plan weekend trip',
    ]);
    expect(allTasks().at(-1)).toBe('Gym session');
  });

  it('filters backend tasks by project and priority', async () => {
    await openHome();
    await click(projectRow('School'));

    expect(column('overdue')).toEqual(['Submit lab report']);
    expect(allTasks()).toEqual(['Submit lab report', 'Read chapter 4', 'Study for quiz']);

    await click(projectRow('School'));
    await click(priorityRow('High'));
    expect(column('overdue')).toEqual(['Submit lab report']);
    expect(allTasks()).toEqual(['Submit lab report', 'Study for quiz', 'Prepare sprint demo']);
  });

  it('filters the task list by the selected calendar day', async () => {
    await openHome();
    await click(el<HTMLButtonElement>('app-mini-calendar [data-date="2026-10-30"]'));

    expect(allTasks()).toEqual(['Read chapter 4', 'Team stand-up notes', 'Gym session']);
    expect(text('.summary')).toContain('2 tasks to do, 1 done');
  });

  it('persists task completion through the Tasks API', async () => {
    await openHome();
    const row = all('app-all-tasks .task').find((item) =>
      item.textContent?.includes('Read chapter 4'),
    )!;
    row.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();

    const request = http.expectOne(`${TASKS_API}/3`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({
      isDone: true,
      doneAt: expect.any(String),
    });
    request.flush({ taskId: 3, message: 'Task updated successfully' });
    await settle();

    expect(column('current')).toEqual(['Team stand-up notes']);
    expect(stat('Done today')).toBe('2');
  });

  it('creates a task through the Tasks API from the dashboard calendar', async () => {
    await openHome();
    await click(el<HTMLButtonElement>('app-mini-calendar [data-date="2026-11-02"]'));
    await click(el<HTMLButtonElement>('app-mini-calendar .add'));

    const title = el<HTMLInputElement>('app-all-tasks input[aria-label="Task title"]');
    title.value = 'Prepare release notes';
    title.dispatchEvent(new Event('input'));
    el<HTMLFormElement>('app-all-tasks form.composer').dispatchEvent(new Event('submit'));

    const request = http.expectOne(TASKS_API);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      priority: 'medium',
      title: 'Prepare release notes',
      description: null,
      dueDate: '2026-11-02',
      deadline: null,
      recurrence: 'none',
    });
    request.flush(asApiTask(task(10, 'Prepare release notes', 4, 2, '2026-11-02')));
    await settle();

    expect(allTasks()).toContain('Prepare release notes');
  });

  it('surfaces dashboard API load errors and can retry', async () => {
    vi.setSystemTime(at(9));
    localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    configure();
    harness = await RouterTestingHarness.create();
    http.expectOne(`${AUTH_API}/me`).flush(USER);
    await harness.navigateByUrl('/home');
    await settle();

    http.expectOne(PROJECTS_API).flush(apiProjects());
    http
      .expectOne(TASKS_LIST)
      .flush({ error: 'Service unavailable' }, { status: 500, statusText: 'Server Error' });
    await settle();
    expect(text('.dashboard-error')).toContain("Couldn't load your dashboard");

    el<HTMLButtonElement>('.dashboard-error button.retry').click();
    await settle();
    http.expectOne(PROJECTS_API).flush(apiProjects());
    http.expectOne(TASKS_LIST).flush(apiTasks());
    await settle();
    expect(column('overdue')).toHaveLength(2);
  });
});
