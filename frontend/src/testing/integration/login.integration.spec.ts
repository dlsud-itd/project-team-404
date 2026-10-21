import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app/app.routes';
import {
  POST_LOGIN_REDIRECT,
  provideSessionRestore,
} from '../../app/features/auth/session/auth.guards';
import { authInterceptor } from '../../app/features/auth/session/auth.interceptor';
import { SessionService } from '../../app/features/auth/session/session.service';
import { TOKEN_STORAGE_KEY } from '../../app/features/auth/session/token-storage.service';
import { environment } from '../../environments/environment';

/**
 * Login & Session frontend integration tests (FE-LOG-02 to FE-LOG-26).
 *
 * The app runs through its real routes (/login behind guestGuard, /home behind authGuard),
 * SessionService, TokenStorageService, authInterceptor and the restore-session initializer.
 * Only the network is faked: HttpTestingController answers with the status codes and bodies
 * the backend returns (backend/src/features/auth/auth.routes.ts).
 */

const API = `${environment.apiBaseUrl}/api/auth`;
const PASSWORD = 'integration-password';
const TOKEN = 'session-token';

// Response bodies copied from backend/src/features/auth (login, session and profile routes).
const USER = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 1,
};
const LOGIN_OK = { token: TOKEN, user: USER };
const LOGIN_REJECTED = { error: 'Invalid email or password' };
const TOKEN_REJECTED = { error: 'Token invalid or expired' };
const LOGOUT_OK = { message: 'Logged out successfully' };
const LOGOUT_REJECTED = { error: 'Unauthorized' };
const PROFILE = { username: 'james', timezone: 'Asia/Manila' };

const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

describe('Login & Session integration (Login UI, session restore, guards, interceptor, logout)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;
  let session: SessionService;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;

  function type(id: string, value: string): void {
    const input = el<HTMLInputElement>(`#${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    harness.detectChanges();
  }

  function submit(): void {
    el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    harness.detectChanges();
  }

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  function storedToken(): string | null {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  function storedValues(): string[] {
    const values: string[] = [];
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)!;
        values.push(`${key}=${storage.getItem(key)}`);
      }
    }
    return document.cookie ? [...values, document.cookie] : values;
  }

  /** Starts the app the way a page load does, optionally with a token kept from earlier. */
  async function startApp(savedToken?: string): Promise<void> {
    if (savedToken) localStorage.setItem(TOKEN_STORAGE_KEY, savedToken);

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideSessionRestore(),
      ],
    });
    // The first inject runs the app initializers, which start the session restore.
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    session = TestBed.inject(SessionService);
    harness = await RouterTestingHarness.create();
  }

  /** Starts the app with a stored token that GET /api/auth/me accepts. */
  async function startSignedIn(): Promise<void> {
    await startApp(TOKEN);
    http.expectOne(`${API}/me`).flush(USER);
  }

  async function logIn(): Promise<void> {
    await harness.navigateByUrl('/login');
    type('identifier', 'james@example.com');
    type('password', PASSWORD);
    submit();
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => http.verify());

  describe('login form', () => {
    // FE-LOG-03, FE-LOG-20, FE-LOG-21
    it('posts {identifier, password}, stores the token, sets currentUser and redirects', async () => {
      await startApp();
      await logIn();

      const req = http.expectOne(`${API}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ identifier: 'james@example.com', password: PASSWORD });
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush(LOGIN_OK);
      await settle();

      expect(storedToken()).toBe(TOKEN);
      expect(session.currentUser()).toEqual(USER);
      expect(router.url).toBe(POST_LOGIN_REDIRECT);
      expect(page().textContent).toContain('Welcome, james');
    });

    // FE-LOG-05
    it('shows one generic message on 401, clears the password, stays on /login and stores no token', async () => {
      await startApp();
      await logIn();

      http.expectOne(`${API}/login`).flush(LOGIN_REJECTED, UNAUTHORIZED);
      await settle();

      const alerts = page().querySelectorAll('[role="alert"]');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].textContent).toContain('Incorrect email/username or password.');
      expect(el<HTMLInputElement>('#password').value).toBe('');
      expect(el<HTMLInputElement>('#identifier').value).toBe('james@example.com');
      expect(router.url).toBe('/login');
      expect(storedToken()).toBeNull();
      expect(session.currentUser()).toBeNull();
    });

    // FE-LOG-02
    it('sends no request when submitted with empty fields', async () => {
      await startApp();
      await harness.navigateByUrl('/login');
      submit();

      http.expectNone(`${API}/login`);
      expect(router.url).toBe('/login');
    });

    // FE-LOG-21
    it.each([
      ['accepted', LOGIN_OK, { status: 200, statusText: 'OK' }],
      ['rejected', LOGIN_REJECTED, UNAUTHORIZED],
    ] as const)(
      'never puts the password in the URL or browser storage (%s)',
      async (_label, body, init) => {
        await startApp();
        await logIn();

        const req = http.expectOne(`${API}/login`);
        expect(req.request.urlWithParams).not.toContain(PASSWORD);
        expect(req.request.params.keys()).toEqual([]);
        req.flush(body, init);
        await settle();

        expect(router.url).not.toContain(PASSWORD);
        expect(storedValues().join('\n')).not.toContain(PASSWORD);
      },
    );
  });

  // FE-LOG-11, FE-LOG-12, FE-LOG-26
  describe('session restore at app start', () => {
    it('sends GET /api/auth/me with the stored token and fills currentUser', async () => {
      await startApp(TOKEN);

      const req = http.expectOne(`${API}/me`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
      req.flush(USER);

      await harness.navigateByUrl('/home');
      expect(session.currentUser()).toEqual(USER);
      expect(router.url).toBe('/home');
      expect(page().textContent).toContain('Welcome, james');
    });

    it('clears the token and goes to /login when /me answers 401', async () => {
      await startApp('revoked-token');

      http.expectOne(`${API}/me`).flush(TOKEN_REJECTED, UNAUTHORIZED);
      await harness.navigateByUrl('/home');

      expect(storedToken()).toBeNull();
      expect(session.currentUser()).toBeNull();
      expect(router.url).toBe('/login');
    });

    it('sends no /me request when no token is stored', async () => {
      await startApp();

      http.expectNone(`${API}/me`);
      expect(session.currentUser()).toBeNull();
    });
  });

  // FE-LOG-13, FE-LOG-14
  describe('route guards', () => {
    it('sends a signed-out user opening a protected route to /login', async () => {
      await startApp();
      await harness.navigateByUrl('/home');

      expect(router.url).toBe('/login');
      expect(el('form')).toBeTruthy();
    });

    it.each(['/login', '/register'])('redirects a signed-in user away from %s', async (url) => {
      await startSignedIn();
      await harness.navigateByUrl(url);

      expect(router.url).toBe(POST_LOGIN_REDIRECT);
    });
  });

  // FE-LOG-22, FE-LOG-23
  describe('auth interceptor', () => {
    it('adds the Bearer token to API calls only', async () => {
      await startSignedIn();
      const client = TestBed.inject(HttpClient);

      client.get(`${API}/profile`).subscribe();
      client.get('https://example.com/other-site').subscribe();

      const api = http.expectOne(`${API}/profile`);
      expect(api.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
      api.flush(PROFILE);

      const other = http.expectOne('https://example.com/other-site');
      expect(other.request.headers.has('Authorization')).toBe(false);
      other.flush({});
    });

    it('clears the session and redirects to /login when any API call answers 401', async () => {
      await startSignedIn();
      await harness.navigateByUrl('/home');

      TestBed.inject(HttpClient)
        .get(`${API}/profile`)
        .subscribe({ error: () => {} });
      http.expectOne(`${API}/profile`).flush(TOKEN_REJECTED, UNAUTHORIZED);
      await settle();

      expect(storedToken()).toBeNull();
      expect(session.currentUser()).toBeNull();
      expect(router.url).toBe('/login');
    });
  });

  // FE-LOG-17, FE-LOG-19, FE-LOG-24, FE-LOG-25
  describe('logout button', () => {
    it.each([
      ['200', LOGOUT_OK, { status: 200, statusText: 'OK' }],
      ['401', LOGOUT_REJECTED, UNAUTHORIZED],
    ] as const)(
      'posts /api/auth/logout with the token and ends the session (server answers %s)',
      async (_label, body, init) => {
        await startSignedIn();
        await harness.navigateByUrl('/home');

        el<HTMLButtonElement>('button.logout').click();
        const req = http.expectOne(`${API}/logout`);
        expect(req.request.method).toBe('POST');
        expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
        req.flush(body, init);
        await settle();

        expect(storedToken()).toBeNull();
        expect(session.currentUser()).toBeNull();
        expect(router.url).toBe('/login');

        // The old token is never sent again.
        TestBed.inject(HttpClient)
          .get(`${API}/profile`)
          .subscribe({ error: () => {} });
        const after = http.expectOne(`${API}/profile`);
        expect(after.request.headers.has('Authorization')).toBe(false);
        after.flush(LOGOUT_REJECTED, UNAUTHORIZED);
        await settle();
      },
    );

    it('still ends the session when the logout request fails on the network', async () => {
      await startSignedIn();
      await harness.navigateByUrl('/home');

      el<HTMLButtonElement>('button.logout').click();
      http.expectOne(`${API}/logout`).error(new ProgressEvent('error'));
      await settle();

      expect(storedToken()).toBeNull();
      expect(session.currentUser()).toBeNull();
      expect(router.url).toBe('/login');
    });
  });

  // Integration-level run of the FE-LOG-27 flow; the browser E2E test is still to be written.
  it('logs in, keeps the session across a restart, then logs out', async () => {
    await startApp();
    await logIn();
    http.expectOne(`${API}/login`).flush(LOGIN_OK);
    await settle();
    expect(router.url).toBe('/home');

    // A refresh starts a new app that only has the stored token.
    const saved = storedToken()!;
    TestBed.resetTestingModule();
    await startApp(saved);
    http.expectOne(`${API}/me`).flush(USER);
    await harness.navigateByUrl('/home');
    expect(page().textContent).toContain('Welcome, james');

    el<HTMLButtonElement>('button.logout').click();
    http.expectOne(`${API}/logout`).flush(LOGOUT_OK);
    await settle();
    expect(router.url).toBe('/login');
    expect(storedToken()).toBeNull();
  });
});
