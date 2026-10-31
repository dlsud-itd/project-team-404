import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../../src/app/app.routes';
import { provideSessionRestore } from '../../../../src/app/features/auth/session/auth.guards';
import { authInterceptor } from '../../../../src/app/features/auth/session/auth.interceptor';
import { SessionService } from '../../../../src/app/features/auth/session/session.service';
import { TOKEN_STORAGE_KEY } from '../../../../src/app/features/auth/session/token-storage.service';
import { environment } from '../../../../src/environments/environment';

/**
 * Home dashboard frontend integration tests.
 *
 * The app runs through its real /home route behind authGuard, with the real Home page, its
 * board and sidebar components, DashboardStore, SessionService and authInterceptor. The user
 * is signed in by restoring a stored token and answering GET /api/auth/me. Only the network
 * and the clock are faked; the dashboard's sample tasks are dated relative to that clock.
 */

const AUTH_API = `${environment.apiBaseUrl}/api/auth`;
const TOKEN = 'session-token';
const USER = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 1,
};

/** Friday 30 October 2026, local time. */
const at = (hour: number) => new Date(2026, 9, 30, hour, 0, 0);

describe('Home integration (dashboard, sidebar filters, new task, account menu)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const text = (selector: string) => el(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const button = (label: string) => el<HTMLButtonElement>(`button[aria-label="${label}"]`);

  /** Task titles in a status column ('current', 'upcoming' or 'overdue'). */
  const column = (status: string) =>
    all(`section[aria-labelledby="col-${status}"] .task .title`).map((t) => t.textContent?.trim());
  const allTasks = () => all('app-all-tasks .task .title').map((t) => t.textContent?.trim());
  const stat = (label: string) =>
    all('.stat')
      .find((s) => s.querySelector('dt')?.textContent?.trim() === label)!
      .querySelector('dd')!
      .textContent!.trim();
  const projectRow = (name: string) =>
    all('app-project-list button.row').find((b) => b.querySelector('.name')?.textContent === name)!;
  const priorityRow = (label: string) =>
    all('app-priority-list button.row').find(
      (b) => b.querySelector('.badge')?.textContent === label,
    )!;
  const projectNames = () =>
    all('app-project-list .project .name').map((n) => n.textContent?.trim());

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function click(target: HTMLElement): Promise<void> {
    target.click();
    await settle();
  }

  function type(target: HTMLInputElement, value: string): void {
    target.value = value;
    target.dispatchEvent(new Event('input'));
    target.dispatchEvent(new Event('blur'));
    harness.detectChanges();
  }

  function choose(select: HTMLSelectElement, value: string): void {
    select.value = value;
    select.dispatchEvent(new Event('change'));
    harness.detectChanges();
  }

  async function submit(form: HTMLFormElement): Promise<void> {
    form.dispatchEvent(new Event('submit', { cancelable: true }));
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

  /** Signs in by restoring a stored token, then opens /home at the given hour. */
  /** The calendar still opens the sample form; "+ New Task" opens the real one in a popup. */
  async function openSampleComposer(): Promise<void> {
    await click(el('app-mini-calendar [aria-current="date"]'));
    await click(el('app-mini-calendar .add'));
    await click(el('app-mini-calendar .clear'));
  }

  async function openHome(hour = 9): Promise<void> {
    vi.setSystemTime(at(hour));
    localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    configure();
    harness = await RouterTestingHarness.create();
    http.expectOne(`${AUTH_API}/me`).flush(USER);
    await harness.navigateByUrl('/home');
    await settle();
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Only Date is faked, so the router and HttpClient keep their real timers.
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  // Case 1
  it('sends a signed-out visit to /login', async () => {
    configure();
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/home');
    await settle();

    expect(router.url).toBe('/login');
  });

  // Case 2
  it.each([
    [9, 'Good Morning'],
    [14, 'Good Afternoon'],
    [20, 'Good Evening'],
  ])('at %i:00 greets with "%s" and the username', async (hour, greeting) => {
    await openHome(hour);

    expect(text('h1.greeting')).toBe(`${greeting}, james`);
    expect(text('button.avatar [aria-hidden="true"]')).toBe('J');
  });

  // Case 3
  it('shows the overdue note, open tasks and done today from the sample data', async () => {
    await openHome();

    // Two sample tasks are past due, eight are open and one was done today.
    expect(text('.overdue-note')).toBe('You have 2 overdue tasks.');
    expect(stat('Open tasks')).toBe('8');
    expect(stat('Done today')).toBe('1');
    expect(el('app-mini-calendar [aria-current="date"]')?.textContent?.trim()).toBe('30');
  });

  // Case 4
  it('puts each task in its status column and done tasks only in the list, checked', async () => {
    await openHome();

    expect(column('overdue')).toEqual(['Submit lab report', 'Reply to client email']);
    expect(column('current')).toEqual(['Read chapter 4', 'Team stand-up notes']);
    expect(column('upcoming')).toEqual([
      'Study for quiz',
      'Prepare sprint demo',
      'Call grandma',
      'Plan weekend trip',
    ]);
    // The board has no Done column; finished tasks stay in All Tasks, checked and last.
    expect(all('section.column h2').map((h) => h.textContent?.trim())).toEqual([
      'Current',
      'Upcoming',
      'Overdue',
    ]);
    const gym = all('app-all-tasks .task').at(-1)!;
    expect(gym.querySelector('.title')?.textContent).toBe('Gym session');
    expect(gym.classList).toContain('done');
    expect(gym.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(true);
  });

  it('moves a task to done when it is checked off', async () => {
    await openHome();
    const readChapter = all('app-all-tasks .task').find((t) =>
      t.textContent?.includes('Read chapter 4'),
    )!;
    readChapter.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await settle();

    expect(column('current')).toEqual(['Team stand-up notes']);
    expect(stat('Open tasks')).toBe('7');
    expect(stat('Done today')).toBe('2');
  });

  // Case 5
  it('filters by project and clears the filter when the project is clicked again', async () => {
    await openHome();
    await click(projectRow('School'));

    expect(projectRow('School').getAttribute('aria-pressed')).toBe('true');
    expect(projectRow('All Projects').getAttribute('aria-pressed')).toBe('false');
    expect(column('overdue')).toEqual(['Submit lab report']);
    expect(column('current')).toEqual(['Read chapter 4']);
    expect(column('upcoming')).toEqual(['Study for quiz']);
    expect(allTasks()).toEqual(['Submit lab report', 'Read chapter 4', 'Study for quiz']);

    await click(projectRow('School'));
    expect(projectRow('School').getAttribute('aria-pressed')).toBe('false');
    expect(projectRow('All Projects').getAttribute('aria-pressed')).toBe('true');
    expect(allTasks()).toHaveLength(9);
  });

  it('filters by priority and clears the filter when the priority is clicked again', async () => {
    await openHome();
    await click(priorityRow('High'));

    expect(priorityRow('High').getAttribute('aria-pressed')).toBe('true');
    expect(column('overdue')).toEqual(['Submit lab report']);
    expect(column('current')).toEqual([]);
    expect(text('section[aria-labelledby="col-current"] .empty')).toBe('Nothing here');
    expect(column('upcoming')).toEqual(['Study for quiz', 'Prepare sprint demo']);
    expect(allTasks()).toEqual(['Submit lab report', 'Study for quiz', 'Prepare sprint demo']);

    await click(priorityRow('High'));
    expect(priorityRow('High').getAttribute('aria-pressed')).toBe('false');
    expect(allTasks()).toHaveLength(9);
  });

  it('shows open-task counts per project and priority in the sidebar', async () => {
    await openHome();
    const count = (row: HTMLElement) => row.querySelector('.count')?.textContent?.trim();

    expect(count(projectRow('All Projects'))).toBe('8');
    expect(['School', 'Work', 'Personal'].map((p) => count(projectRow(p)))).toEqual([
      '3',
      '3',
      '2',
    ]);
    expect(['High', 'Medium', 'Low'].map((p) => count(priorityRow(p)))).toEqual(['3', '3', '2']);
  });

  // Case 6
  describe('new task', () => {
    const composer = () => el<HTMLFormElement>('form.composer');
    const titleInput = () => el<HTMLInputElement>('input[aria-label="Task title"]');

    async function openComposer(): Promise<void> {
      await openSampleComposer();
      expect(composer()).toBeTruthy();
    }

    it.each([
      ['empty', ''],
      ['only spaces', '   '],
      ['over 120 characters', 'x'.repeat(121)],
    ])('blocks a title that is %s', async (_, title) => {
      await openHome();
      await openComposer();
      type(titleInput(), title);
      await submit(composer());

      expect(composer()).toBeTruthy();
      expect(titleInput().getAttribute('aria-invalid')).toBe('true');
      expect(allTasks()).toHaveLength(9);
      expect(stat('Open tasks')).toBe('8');
    });

    it('adds a valid task to the right column and updates the counts', async () => {
      await openHome();
      await openComposer();
      type(titleInput(), '  Write essay  ');
      choose(el('select[aria-label="Project"]'), '1');
      choose(el('select[aria-label="Priority"]'), 'high');
      await submit(composer());

      expect(composer()).toBeNull();
      expect(column('current')).toEqual(['Read chapter 4', 'Team stand-up notes', 'Write essay']);
      expect(stat('Open tasks')).toBe('9');
      expect(projectRow('School').querySelector('.count')?.textContent?.trim()).toBe('4');
      expect(priorityRow('High').querySelector('.count')?.textContent?.trim()).toBe('4');
    });

    it('puts a task due later in Upcoming', async () => {
      await openHome();
      await openComposer();
      type(titleInput(), 'Book flights');
      type(el<HTMLInputElement>('input[aria-label="Due date"]'), '2026-11-02');
      await submit(composer());

      expect(column('upcoming')).toContain('Book flights');
      expect(column('current')).not.toContain('Book flights');
    });
  });

  // Case 7
  describe('sidebar projects', () => {
    it('adds a project to the list', async () => {
      await openHome();
      await click(button('Add project'));
      type(el<HTMLInputElement>('input[aria-label="New project name"]'), '  Thesis  ');
      await submit(el('app-project-list form.name-form'));

      expect(projectNames()).toEqual(['School', 'Work', 'Personal', 'Thesis']);
      expect(projectRow('Thesis').querySelector('.count')?.textContent?.trim()).toBe('0');
      expect(el('input[aria-label="New project name"]')).toBeNull();
    });

    it('renames a project, and Escape cancels a rename', async () => {
      await openHome();
      await click(button('Rename School'));
      type(el<HTMLInputElement>('input[aria-label="Project name"]'), 'University');
      await submit(el('app-project-list form.name-form'));

      expect(projectNames()).toEqual(['University', 'Work', 'Personal']);

      await click(button('Rename Work'));
      el('input[aria-label="Project name"]').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape' }),
      );
      await settle();
      expect(el('input[aria-label="Project name"]')).toBeNull();
      expect(projectNames()).toEqual(['University', 'Work', 'Personal']);
    });

    it('deletes a project; its tasks stay, without a project, and its filter is cleared', async () => {
      await openHome();
      await click(projectRow('Work'));
      await click(button('Delete Work'));

      expect(projectNames()).toEqual(['School', 'Personal']);
      expect(projectRow('All Projects').getAttribute('aria-pressed')).toBe('true');
      expect(allTasks()).toHaveLength(9);
      expect(stat('Open tasks')).toBe('8');
      // The new-task form no longer offers it.
      await openSampleComposer();
      expect(all('select[aria-label="Project"] option').map((o) => o.textContent?.trim())).toEqual([
        'No project',
        'School',
        'Personal',
      ]);
    });
  });

  // Case 8
  describe('account menu', () => {
    it('opens the menu and goes to Profile settings', async () => {
      await openHome();
      const avatar = el<HTMLButtonElement>('button.avatar');
      expect(avatar.getAttribute('aria-expanded')).toBe('false');
      await click(avatar);

      expect(avatar.getAttribute('aria-expanded')).toBe('true');
      expect(text('[role="menu"] .menu-user')).toBe('james');
      expect(el('[role="menu"] .menu-link').getAttribute('href')).toBe('/settings/profile');
      await click(el('[role="menu"] .menu-link'));

      expect(router.url).toBe('/settings/profile');
      // The profile page loads the user's profile.
      http
        .expectOne(`${AUTH_API}/profile`)
        .flush({ id: 'user-1', username: 'james', timezone: 'Asia/Manila' });
    });

    it('logs out with POST /api/auth/logout, clears the session and goes to /login', async () => {
      await openHome();
      await click(el('button.avatar'));
      await click(el('[role="menu"] button.logout'));

      expect(text('[role="menu"] button.logout')).toBe('Logging out…');
      const req = http.expectOne(`${AUTH_API}/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
      req.flush({ message: 'Logged out successfully' });
      await settle();

      expect(router.url).toBe('/login');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(TestBed.inject(SessionService).currentUser()).toBeNull();
    });
  });
});
