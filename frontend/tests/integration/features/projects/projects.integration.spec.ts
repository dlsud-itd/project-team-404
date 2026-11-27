import { type CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  type TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../../src/app/app.routes';
import { provideSessionRestore } from '../../../../src/app/features/auth/session/auth.guards';
import { authInterceptor } from '../../../../src/app/features/auth/session/auth.interceptor';
import { SessionService } from '../../../../src/app/features/auth/session/session.service';
import { TOKEN_STORAGE_KEY } from '../../../../src/app/features/auth/session/token-storage.service';
import { ProjectsStore } from '../../../../src/app/features/projects/shared/state/projects.store';
import { environment } from '../../../../src/environments/environment';
import { ToastService } from '../../../../src/app/shared/services/toast.service';

/**
 * Project CRUD and Project Organization frontend integration tests (Sprint 2: FE-LST, FE-CRT,
 * FE-EDT, FE-ORG and FE-DEL rows).
 *
 * The app runs through its real /projects routes behind authGuard, ProjectService,
 * ProjectOrganizationService, ProjectsStore, the project-permissions and split-projects utils,
 * the project switcher's CDK drop lists and authInterceptor. The user is signed in by restoring a stored
 * token and answering GET /api/auth/me. Only the network is faked: HttpTestingController answers
 * with the status codes and bodies of backend/src/features/projects (project-crud and
 * project-organization).
 */

const AUTH_API = `${environment.apiBaseUrl}/api/auth`;
const API = `${environment.apiBaseUrl}/api/projects`;
const TOKEN = 'session-token';

const USER = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 1,
};

// Projects as the backend sends them (toProjectModel): `id`, not `projectId`, plus timestamps.
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
const CAPSTONE = {
  ...INBOX,
  id: 10,
  name: 'Capstone',
  description: 'Final project',
  color: '#2563EB',
  isInbox: false,
  sortOrder: 1,
};
const THESIS = { ...CAPSTONE, id: 11, name: 'Thesis', description: null, sortOrder: 2 };

// Error bodies from validate-request.middleware.ts, owned-project.middleware.ts and
// require-auth.middleware.ts.
const CREATE_INVALID = {
  error: 'Invalid project details',
  details: [{ field: 'name', message: 'Too big: expected string to have <=150 characters' }],
};
const UPDATE_INVALID = {
  error: 'Invalid project update',
  details: [{ field: 'description', message: 'Too big: expected string to have <=500 characters' }],
};
const NOT_FOUND = { error: 'Project not found' };
const TOKEN_REJECTED = { error: 'Token invalid or expired' };

const status = (code: number, statusText = 'Error') => ({ status: code, statusText });

describe('Projects integration (Project CRUD screens + API)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;
  let session: SessionService;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => [...page().querySelectorAll<HTMLElement>(selector)];
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';
  // The confirm dialog is rendered inside the list page.
  const dialogButton = (label: string) =>
    all('[role="alertdialog"] button').find((b) => b.textContent?.trim() === label)!;

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  function type(id: string, value: string): void {
    const input = el<HTMLInputElement | HTMLTextAreaElement>(`#${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    harness.detectChanges();
  }

  function pickColor(value: string): void {
    el<HTMLInputElement>(`input[type="radio"][data-color="${value}"]`).click();
    harness.detectChanges();
  }

  function submit(): void {
    el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    harness.detectChanges();
  }

  function cardNames(): string[] {
    return all('app-project-card .name').map((n) => n.firstChild?.textContent?.trim() ?? '');
  }

  function card(name: string): HTMLElement {
    return all('app-project-card').find((c) =>
      c.querySelector('.name')?.textContent?.includes(name),
    )!;
  }

  function flushProjectLists(active: object[], archived: object[] = []): void {
    http.expectOne(`${API}?isArchived=false`).flush(active);
    http.expectOne(`${API}?isArchived=true`).flush(archived);
  }

  function storedToken(): string | null {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  /** Signs in the way a page load does: a stored token that GET /api/auth/me accepts. */
  async function startSignedIn(): Promise<void> {
    localStorage.setItem(TOKEN_STORAGE_KEY, TOKEN);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    session = TestBed.inject(SessionService);
    harness = await RouterTestingHarness.create();
    http.expectOne(`${AUTH_API}/me`).flush(USER);
  }

  /** Opens a projects URL; the guard waits for the session restore above. */
  async function open(url: string): Promise<void> {
    await harness.navigateByUrl(url);
    await settle();
  }

  /** Opens a project card's ⋯ menu, reads its items and closes it again. */
  async function menuItems(name: string): Promise<string[]> {
    card(name).querySelector<HTMLButtonElement>('button.more')!.click();
    await settle();
    const items = [...document.querySelectorAll('.cdk-overlay-container .item')].map(
      (i) => i.textContent?.trim() ?? '',
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();
    return items;
  }

  /** Picks an item from a project card's ⋯ menu. */
  async function pickFromMenu(name: string, item: string): Promise<void> {
    card(name).querySelector<HTMLButtonElement>('button.more')!.click();
    await settle();
    [...document.querySelectorAll<HTMLButtonElement>('.cdk-overlay-container .item')]
      .find((i) => i.textContent?.trim() === item)!
      .click();
    await settle();
  }

  /** Opens /projects and answers its GET /api/projects. */
  async function openList(projects: object[] = [INBOX, CAPSTONE, THESIS]): Promise<void> {
    await open('/projects');
    const active = http.expectOne(`${API}?isArchived=false`);
    const archived = http.expectOne(`${API}?isArchived=true`);
    expect(active.request.method).toBe('GET');
    expect(active.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    active.flush(projects);
    archived.flush([]);
    await settle();
  }

  /** Opens the edit page for a project and answers its GET /api/projects/:id. */
  async function openEdit(project: { id: number } = CAPSTONE): Promise<void> {
    await open(`/projects/${project.id}/edit`);
    const req = http.expectOne(`${API}/${project.id}`);
    expect(req.request.method).toBe('GET');
    req.flush(project);
    await settle();
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
      // Opening a project stamps it for the dashboard's "Recently accessed" sort.
      http?.match((r) => r.url.endsWith('/access'));
      if (http) http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  // The top bar stays on every signed-in page.
  describe('Top bar', () => {
    it('stays when a project is opened', async () => {
      await startSignedIn();
      await openList();

      el<HTMLAnchorElement>('a.tasks-link').click();
      await settle();

      expect(router.url).toMatch(/^\/projects\/\d+\/tasks$/);
      expect(el('header.topbar')).toBeTruthy();
      expect(el('#tab-projects').getAttribute('aria-selected')).toBe('true');
      http.match(() => true).forEach((req) => req.flush([]));
    });

    it('stays on the edit project page', async () => {
      await startSignedIn();
      await openEdit();

      expect(el('header.topbar')).toBeTruthy();
    });
  });

  // Case 1: list page and its states.
  describe('Project list', () => {
    // FE-LST-01, FE-LST-11
    it('loads GET /api/projects with the token and shows a card per project, Inbox first', async () => {
      await startSignedIn();
      await openList([THESIS, CAPSTONE, INBOX]);

      expect(router.url).toBe('/home?tab=projects');
      expect(cardNames()).toEqual(['Inbox', 'Capstone', 'Thesis']);
      expect(text('app-project-card.inbox .badge')).toBe('Read-only');
      expect(card('Capstone').querySelector('.description')?.textContent?.trim()).toBe(
        'Final project',
      );
      // A project's color shows only as a small dot.
      expect(card('Capstone').querySelector<HTMLElement>('.dot')?.style.background).toBe(
        'rgb(37, 99, 235)',
      );
    });

    // FE-LST-06
    it('shows a loading state until the list arrives', async () => {
      await startSignedIn();
      await open('/projects');

      expect(text('[role="status"]')).toBe('Loading projects…');
      expect(all('app-project-card')).toHaveLength(0);

      flushProjectLists([INBOX]);
      await settle();
      expect(el('[role="status"]')).toBeNull();
    });

    // FE-LST-05
    it('invites the user to create a project when only the Inbox exists', async () => {
      await startSignedIn();
      await openList([INBOX]);

      expect(cardNames()).toEqual(['Inbox']);
      expect(text('.empty-title')).toBe('You only have your Inbox so far.');
      expect(text('.empty button.new')).toBe('Create your first project');
    });

    // FE-LST-07
    it('shows an error with a retry that loads the list again', async () => {
      await startSignedIn();
      await open('/projects');
      http
        .expectOne(`${API}?isArchived=false`)
        .flush({ error: 'Internal server error' }, status(500));
      expect(http.expectOne(`${API}?isArchived=true`).cancelled).toBe(true);
      await settle();

      expect(text('.load-error p')).toBe(
        "Couldn't load your projects. Something went wrong. Please try again.",
      );
      el<HTMLButtonElement>('.load-error button').click();
      await settle();

      // Retrying clears the error and sends the list request again.
      expect(el('.load-error')).toBeNull();
      flushProjectLists([INBOX, CAPSTONE]);
      await settle();
      expect(el('.load-error')).toBeNull();
      expect(cardNames()).toEqual(['Inbox', 'Capstone']);
    });
  });

  // Case 2 and case 6: the Inbox is read-only.
  describe('Inbox permissions', () => {
    // FE-LST-02, FE-DEL-05
    it('offers no star, edit or archive on the Inbox, and never a delete on any project', async () => {
      await startSignedIn();
      await openList();

      expect(card('Inbox').querySelector('button.star')).toBeNull();
      expect(await menuItems('Inbox')).toEqual(['Default project']);
      expect(await menuItems('Capstone')).toEqual(['Edit', 'Set as default project', 'Archive']);
      expect(page().querySelector('[aria-label^="Delete"]')).toBeNull();
    });

    it("blocks the Inbox's edit URL opened directly: no form and nothing can be sent", async () => {
      await startSignedIn();
      await openEdit(INBOX);

      expect(el('form')).toBeNull();
      expect(text('.message p')).toBe(
        "Your Inbox is read-only, so it can't be renamed or changed.",
      );
      expect(el<HTMLAnchorElement>('.message a').getAttribute('href')).toBe('/projects');
    });
  });

  // Case 3: create.
  describe('Create', () => {
    /** Opens the Projects tab, then the new-project popup. */
    async function openCreate(): Promise<void> {
      await openList([INBOX]);
      el<HTMLButtonElement>('.title-row button.new').click();
      await settle();
    }

    // FE-CRT-01, FE-CRT-04
    it('shows name, description, a hex-only color picker and the submit button', async () => {
      await startSignedIn();
      await openCreate();

      expect(el('label[for="project-name"]')).toBeTruthy();
      expect(el('label[for="project-description"]')).toBeTruthy();
      expect(text('button[type="submit"]')).toBe('Create project');
      const colors = all('input[type="radio"]').map((r) => r.getAttribute('data-color'));
      expect(colors.length).toBeGreaterThan(1);
      // "No color" plus only #RRGGBB values.
      expect(colors.filter((c) => c !== '').every((c) => /^#[0-9A-F]{6}$/i.test(c!))).toBe(true);
      expect(colors).toContain('');
    });

    // FE-CRT-02
    it('requires a name and sends nothing when submitted empty', async () => {
      await startSignedIn();
      await openCreate();
      type('project-name', '   ');
      submit();

      http.expectNone(API);
      expect(text('#project-name-status')).toBe('Project name is required.');
    });

    // FE-CRT-03
    it('blocks a name over 150 or a description over 500 characters', async () => {
      await startSignedIn();
      await openCreate();
      type('project-name', 'x'.repeat(151));
      type('project-description', 'd'.repeat(501));
      submit();

      http.expectNone(API);
      expect(text('#project-name-status')).toBe('Use 150 characters or fewer.');
      expect(text('#project-description-status')).toBe('Use 500 characters or fewer.');
    });

    // FE-CRT-05, FE-CRT-06, FE-CRT-11
    it('POSTs {name, description, color} once, then shows the new card on the list without a reload', async () => {
      await startSignedIn();
      await openCreate();
      type('project-name', '  Thesis  ');
      type('project-description', 'Chapter drafts');
      pickColor('#16A34A');
      submit();

      const button = el<HTMLButtonElement>('button[type="submit"]');
      expect(button.disabled).toBe(true);
      expect(button.textContent?.trim()).toBe('Creating…');
      // A second submit while the request runs sends nothing.
      submit();

      const req = http.expectOne(API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: 'Thesis',
        description: 'Chapter drafts',
        color: '#16A34A',
      });
      req.flush(
        { ...THESIS, description: 'Chapter drafts', color: '#16A34A' },
        status(201, 'Created'),
      );
      await settle();

      // The list stayed on screen behind the popup, so no reload is needed.
      expect(router.url).toBe('/home?tab=projects');
      expect(el('[role="dialog"]')).toBeNull();
      expect(cardNames()).toEqual(['Inbox', 'Thesis']);
    });

    // FE-CRT-12
    it('sends empty optional fields as null', async () => {
      await startSignedIn();
      await openCreate();
      type('project-name', 'Thesis');
      submit();

      const req = http.expectOne(API);
      expect(req.request.body).toEqual({ name: 'Thesis', description: null, color: null });
      req.flush(THESIS, status(201, 'Created'));
      await settle();
    });

    // FE-CRT-07
    it('shows a 400 on the field its details name and keeps the input', async () => {
      await startSignedIn();
      await openCreate();
      type('project-name', 'Thesis');
      submit();
      http.expectOne(API).flush(CREATE_INVALID, status(400, 'Bad Request'));
      await settle();

      expect(el('[role="dialog"]')).toBeTruthy();
      expect(text('#project-name-status')).toBe('Enter a project name of 150 characters or fewer.');
      expect(el<HTMLInputElement>('#project-name').value).toBe('Thesis');
      expect(el<HTMLButtonElement>('button[type="submit"]').disabled).toBe(false);
    });

    // FE-CRT-08
    it('shows a generic error on a 500 and lets the user retry', async () => {
      await startSignedIn();
      await openCreate();
      type('project-name', 'Thesis');
      submit();
      http.expectOne(API).flush({ error: 'Internal server error' }, status(500));
      await settle();

      expect(text('.form-error')).toBe('Something went wrong. Please try again.');
      expect(el<HTMLInputElement>('#project-name').value).toBe('Thesis');

      submit();
      http.expectOne(API).flush(THESIS, status(201, 'Created'));
      await settle();
      expect(cardNames()).toEqual(['Inbox', 'Thesis']);
    });

    // FE-CRT-09
    it('closes the popup without creating anything when cancelled', async () => {
      await startSignedIn();
      await openCreate();
      type('project-name', 'Thesis');
      all('button')
        .find((b) => b.textContent?.trim() === 'Cancel')!
        .click();
      await settle();

      expect(router.url).toBe('/home?tab=projects');
      expect(el('[role="dialog"]')).toBeNull();
      // The form never sent anything.
      http.expectNone(API);
    });
  });

  // Case 4: edit.
  describe('Edit', () => {
    // FE-EDT-01, FE-EDT-04
    it('prefills the form and keeps Save off until something changes', async () => {
      await startSignedIn();
      await openEdit();

      expect(el<HTMLInputElement>('#project-name').value).toBe('Capstone');
      expect(el<HTMLTextAreaElement>('#project-description').value).toBe('Final project');
      expect(el<HTMLInputElement>('input[data-color="#2563EB"]').checked).toBe(true);
      expect(el<HTMLButtonElement>('button[type="submit"]').disabled).toBe(true);
    });

    // FE-EDT-05, FE-EDT-06, FE-EDT-12
    it('PATCHes only the changed fields once and shows the saved values', async () => {
      await startSignedIn();
      await openEdit();
      type('project-name', 'Capstone II');
      type('project-description', '');
      submit();

      expect(text('button[type="submit"]')).toBe('Saving…');
      submit();

      const req = http.expectOne(`${API}/10`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ name: 'Capstone II', description: null });
      req.flush({ ...CAPSTONE, name: 'Capstone II', description: null });
      await settle();

      expect(text('.form-notice')).toBe('Changes saved.');
      expect(el<HTMLInputElement>('#project-name').value).toBe('Capstone II');
      expect(el<HTMLButtonElement>('button[type="submit"]').disabled).toBe(true);
    });

    // FE-EDT-02
    it('requires a name when it is cleared and sends nothing', async () => {
      await startSignedIn();
      await openEdit();
      type('project-name', '');
      submit();

      http.expectNone(`${API}/10`);
      expect(text('#project-name-status')).toBe('Project name is required.');
    });

    // FE-EDT-09
    it('shows a generic error on a 500 and keeps the edits', async () => {
      await startSignedIn();
      await openEdit();
      type('project-name', 'Capstone II');
      submit();
      http.expectOne(`${API}/10`).flush({ error: 'Internal server error' }, status(500));
      await settle();

      expect(text('.form-error')).toBe('Something went wrong. Please try again.');
      expect(el<HTMLInputElement>('#project-name').value).toBe('Capstone II');
    });

    // FE-EDT-07
    it('shows a 400 on the field its details name and keeps the edits', async () => {
      await startSignedIn();
      await openEdit();
      type('project-description', 'Too long for the server');
      submit();
      http.expectOne(`${API}/10`).flush(UPDATE_INVALID, status(400, 'Bad Request'));
      await settle();

      expect(text('#project-description-status')).toBe('Use 500 characters or fewer.');
      expect(el<HTMLTextAreaElement>('#project-description').value).toBe('Too long for the server');
    });

    // FE-EDT-08
    it('on a 404 shows "Project not found" on the list, which is reloaded without it', async () => {
      await startSignedIn();
      await openEdit();
      type('project-name', 'Capstone II');
      submit();
      http.expectOne(`${API}/10`).flush(NOT_FOUND, status(404, 'Not Found'));
      await settle();

      expect(router.url).toBe('/home?tab=projects');
      flushProjectLists([INBOX, THESIS]);
      await settle();
      expect(text('.banner-error')).toBe('Project not found.');
      expect(cardNames()).toEqual(['Inbox', 'Thesis']);
    });

    // FE-LST-13
    it('shows "Project not found" when the edit URL names a project that does not exist', async () => {
      await startSignedIn();
      await open('/projects/99/edit');
      http.expectOne(`${API}/99`).flush(NOT_FOUND, status(404, 'Not Found'));
      await settle();

      expect(el('form')).toBeNull();
      expect(text('.message p')).toBe('Project not found.');
    });
  });

  // Case 5: delete.
  // Projects are archived here and deleted for good only from the Archive page.
  describe('Archive', () => {
    it('archives a project from its menu at once, and Undo brings it back', async () => {
      await startSignedIn();
      await openList();

      await pickFromMenu('Capstone', 'Archive');
      expect(cardNames()).toEqual(['Inbox', 'Thesis']);
      const req = http.expectOne(`${API}/10/archive`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ isArchived: true });
      req.flush({ projectId: 10, isArchived: true, message: 'Project archived successfully' });
      await settle();

      const [toast] = TestBed.inject(ToastService).toasts();
      expect(toast.message).toBe('Project “Capstone” archived');
      toast.action!.run();
      await settle();
      expect(cardNames()).toEqual(['Inbox', 'Capstone', 'Thesis']);
      http
        .expectOne(`${API}/10/archive`)
        .flush({ projectId: 10, isArchived: false, message: 'Project restored from archive' });
    });

    it('puts the project back with an error toast when archiving fails', async () => {
      await startSignedIn();
      await openList();

      await pickFromMenu('Capstone', 'Archive');
      http.expectOne(`${API}/10/archive`).flush({ error: 'boom' }, status(500));
      await settle();

      expect(cardNames()).toEqual(['Inbox', 'Capstone', 'Thesis']);
      expect(TestBed.inject(ToastService).toasts()[0].kind).toBe('error');
    });
  });

  describe('Expired session', () => {
    // FE-LST-14
    it.each([
      [
        'loading the list',
        async () => open('/projects'),
        () => {
          const req = http.expectOne(`${API}?isArchived=false`);
          req.flush(TOKEN_REJECTED, status(401, 'Unauthorized'));
          expect(http.expectOne(`${API}?isArchived=true`).cancelled).toBe(true);
          return req;
        },
      ],
      [
        'loading a project to edit',
        async () => open('/projects/10/edit'),
        () => http.expectOne(`${API}/10`),
      ],
    ])('clears the session and goes to /login on a 401 when %s', async (_, go, request) => {
      await startSignedIn();
      await go();
      const req = request();
      if (req.request.url === `${API}/10`) req.flush(TOKEN_REJECTED, status(401, 'Unauthorized'));
      await settle();

      expect(router.url).toBe('/login');
      expect(storedToken()).toBeNull();
      expect(session.currentUser()).toBeNull();
    });

    it('clears the session and goes to /login on a 401 when saving', async () => {
      await startSignedIn();
      await openEdit();
      type('project-name', 'Capstone II');
      submit();
      http.expectOne(`${API}/10`).flush(TOKEN_REJECTED, status(401, 'Unauthorized'));
      await settle();

      expect(router.url).toBe('/login');
      expect(storedToken()).toBeNull();
    });

    it('clears the session and goes to /login on a 401 when archiving', async () => {
      await startSignedIn();
      await openList();
      await pickFromMenu('Capstone', 'Archive');
      http.expectOne(`${API}/10/archive`).flush(TOKEN_REJECTED, status(401, 'Unauthorized'));
      await settle();

      expect(router.url).toBe('/login');
      expect(storedToken()).toBeNull();
    });

    // FE-LST-10
    it('redirects to /login when there is no session at all', async () => {
      http = TestBed.inject(HttpTestingController);
      router = TestBed.inject(Router);
      harness = await RouterTestingHarness.create();
      await open('/projects');

      expect(router.url).toBe('/login');
      http.expectNone(API);
    });
  });

  // Project Organization, folded into the single Projects page (FE-ORG rows).
  describe('Project Organization (Projects page)', () => {
    const GYM = {
      ...CAPSTONE,
      id: 12,
      name: 'Gym',
      description: null,
      isFavorite: true,
      sortOrder: 0,
    };
    const OLD = { ...CAPSTONE, id: 13, name: 'Old class', isArchived: true, sortOrder: 3 };
    // Favorites: Gym. My projects: Capstone (1), Thesis (2). Archived: Old class.
    const ALL = [INBOX, GYM, CAPSTONE, THESIS, OLD];

    const button = (label: string) => el<HTMLButtonElement>(`button[aria-label="${label}"]`);
    const names = (scope: string) =>
      all(`${scope} .item .tasks-link`).map((n) => n.textContent?.trim() ?? '');
    const favorites = () => names('section[aria-labelledby="favorites-heading"]');
    const active = () => names('section[aria-labelledby="projects-heading"]');

    async function openPage(projects: object[] = ALL): Promise<void> {
      await open('/home?tab=projects');
      flushProjectLists(
        projects.filter((project) => !(project as { isArchived?: boolean }).isArchived),
        projects.filter((project) => (project as { isArchived?: boolean }).isArchived),
      );
      await settle();
    }

    /** Drops through the list's real CDK handler, as a finished drag does. */
    async function drop(
      group: 'favorites' | 'active',
      previousIndex: number,
      currentIndex: number,
    ) {
      const lists = harness.routeDebugElement!.queryAll(By.directive(CdkDropList));
      const list = lists[group === 'favorites' ? 0 : 1].injector.get(CdkDropList);
      list.dropped.emit({ previousIndex, currentIndex } as CdkDragDrop<unknown>);
      await settle();
    }

    it('groups the Inbox, favorites and my projects, and leaves archived ones to the Archive', async () => {
      await startSignedIn();
      await openPage([OLD, THESIS, CAPSTONE, GYM, INBOX]);

      expect(text('app-project-card.inbox .tasks-link')).toBe('Inbox');
      expect(favorites()).toEqual(['Gym']);
      expect(active()).toEqual(['Capstone', 'Thesis']);
      expect(page().textContent).not.toContain('Old class');
      expect(el('nav[aria-label="Project views"]')).toBeNull();
    });

    it('stars a project straight away and keeps it once the server agrees', async () => {
      await startSignedIn();
      await openPage();
      button('Star Capstone').click();
      await settle();

      // Optimistic: moved before the server answers.
      expect(favorites()).toEqual(['Gym', 'Capstone']);
      expect(button('Unstar Capstone').getAttribute('aria-pressed')).toBe('true');

      const req = http.expectOne(`${API}/10/favorite`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ isFavorite: true });
      req.flush({ projectId: 10, isFavorite: true, message: 'Project added to favorites' });
      await settle();

      expect(favorites()).toEqual(['Gym', 'Capstone']);
      expect(active()).toEqual(['Thesis']);
    });

    it('rolls the star back and shows an error toast on a 500', async () => {
      await startSignedIn();
      await openPage();
      button('Unstar Gym').click();
      await settle();
      expect(favorites()).toEqual([]);

      http.expectOne(`${API}/12/favorite`).flush({ error: 'boom' }, status(500));
      await settle();

      expect(favorites()).toEqual(['Gym']);
      expect(TestBed.inject(ToastService).toasts()[0].kind).toBe('error');
    });

    it('reorders by drag-and-drop: sends every id in the new order and keeps it', async () => {
      await startSignedIn();
      await openPage();
      await drop('active', 0, 1);

      expect(active()).toEqual(['Thesis', 'Capstone']);
      const req = http.expectOne(`${API}/reorder`);
      expect(req.request.method).toBe('PUT');
      // Favorites, then my projects, then archived; never the Inbox.
      expect(req.request.body).toEqual({ projectIds: [12, 11, 10, 13] });
      req.flush({
        projects: [
          { projectId: 12, sortOrder: 0 },
          { projectId: 11, sortOrder: 1 },
          { projectId: 10, sortOrder: 2 },
          { projectId: 13, sortOrder: 3 },
        ],
        message: 'Project order updated successfully',
      });
      await settle();
      expect(active()).toEqual(['Thesis', 'Capstone']);
    });

    it('restores the previous order and shows an error on a 500', async () => {
      await startSignedIn();
      await openPage();
      await drop('active', 0, 1);
      http.expectOne(`${API}/reorder`).flush({ error: 'boom' }, status(500));
      await settle();

      expect(active()).toEqual(['Capstone', 'Thesis']);
      expect(text('.banner-error')).toContain("Your new order wasn't saved.");
    });

    it('clears the session and goes to /login on a 401 when reordering', async () => {
      await startSignedIn();
      await openPage();
      await drop('active', 0, 1);
      http.expectOne(`${API}/reorder`).flush(TOKEN_REJECTED, status(401, 'Unauthorized'));
      await settle();

      expect(router.url).toBe('/login');
      expect(storedToken()).toBeNull();
    });
  });
});
