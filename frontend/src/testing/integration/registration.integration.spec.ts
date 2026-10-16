import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app/app.routes';
import {
  AVAILABILITY_DEBOUNCE_MS,
  DEFAULT_TIMEZONE,
} from '../../app/features/auth/register/register';
import { environment } from '../../environments/environment';

/**
 * Registration frontend integration tests (WBS 2.3.2, FE-REG-20 to FE-REG-27).
 *
 * The sign-up page is reached through the app's real routes and talks to the API through
 * the real AuthService and HttpClient. Only the network is faked: HttpTestingController
 * answers with the status codes and bodies the backend returns (backend/src/features/auth).
 */

const API = `${environment.apiBaseUrl}/api/auth`;
const PASSWORD = 'integration-password';

// Response bodies copied from backend/src/features/auth/auth.routes.ts.
const SIGNUP_CREATED = { userId: 'user-1', inboxProjectId: 1 };
const USERNAME_CONFLICT = { error: 'Username is already in use' };
const EMAIL_CONFLICT = { error: 'Email is already in use' };
const SIGNUP_INVALID = {
  error: 'Invalid signup details',
  details: [{ field: 'timezone', message: 'Must be a valid IANA timezone' }],
};

describe('Registration integration (Sign-Up UI + API)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const messageFor = (id: string) => el(`#${id}-status`).textContent?.trim() ?? '';

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

  /** Lets the availability debounce elapse and answers the check the page sends. */
  function answerCheck(path: string, body: object, status = 200): void {
    vi.advanceTimersByTime(AVAILABILITY_DEBOUNCE_MS);
    const req = http.expectOne(`${API}/${path}`);
    expect(req.request.method).toBe('GET');
    req.flush(body, { status, statusText: status === 200 ? 'OK' : 'Error' });
    harness.detectChanges();
  }

  function fillValidForm(): void {
    type('username', 'james');
    answerCheck('check-username/james', { available: true, username: 'james' });
    type('email', 'james@example.com');
    answerCheck('check-email/james%40example.com', {
      available: true,
      email: 'james@example.com',
    });
    type('password', PASSWORD);
    type('confirmPassword', PASSWORD);
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

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/register');

    // Fake timers only after navigation so the router can settle; they drive the debounce.
    vi.useFakeTimers();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('loads the sign-up page from the /register route', () => {
    expect(router.url).toBe('/register');
    expect(el('form')).toBeTruthy();
  });

  // FE-REG-20
  it('posts the sign-up form to POST /api/auth/signup with only the signup fields', () => {
    fillValidForm();
    submit();

    const req = http.expectOne(`${API}/signup`);
    expect(req.request.method).toBe('POST');
    // confirmPassword is sent because the backend signupSchema requires it.
    expect(req.request.body).toEqual({
      username: 'james',
      email: 'james@example.com',
      password: PASSWORD,
      confirmPassword: PASSWORD,
      timezone: DEFAULT_TIMEZONE,
    });
    req.flush(SIGNUP_CREATED, { status: 201, statusText: 'Created' });
  });

  it('sends the timezone the user picked', () => {
    fillValidForm();
    const select = el<HTMLSelectElement>('#timezone');
    select.value = 'Europe/London';
    select.dispatchEvent(new Event('change'));
    harness.detectChanges();
    submit();

    const req = http.expectOne(`${API}/signup`);
    expect(req.request.body.timezone).toBe('Europe/London');
    req.flush(SIGNUP_CREATED, { status: 201, statusText: 'Created' });
  });

  // FE-REG-21
  it('sends the password only in the request body and never stores it', () => {
    fillValidForm();
    submit();

    const req = http.expectOne(`${API}/signup`);
    expect(req.request.urlWithParams).not.toContain(PASSWORD);
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.body.password).toBe(PASSWORD);

    req.flush(SIGNUP_CREATED, { status: 201, statusText: 'Created' });
    harness.detectChanges();

    expect(router.url).not.toContain(PASSWORD);
    expect(storedValues().join('\n')).not.toContain(PASSWORD);
  });

  it('shows the account-created confirmation after a 201', () => {
    fillValidForm();
    submit();
    http.expectOne(`${API}/signup`).flush(SIGNUP_CREATED, { status: 201, statusText: 'Created' });
    harness.detectChanges();

    expect(el('[role="status"]').textContent).toContain('Account created');
  });

  // FE-REG-24
  describe('availability checks', () => {
    it('calls GET /api/auth/check-username/{username} with the username URL-encoded', () => {
      type('username', 'james.s-1');
      answerCheck('check-username/james.s-1', { available: true, username: 'james.s-1' });
      expect(messageFor('username')).toBe('Username is available');
    });

    it('calls GET /api/auth/check-email/{email} with @ and + URL-encoded', () => {
      type('email', 'james+test@example.com');
      answerCheck('check-email/james%2Btest%40example.com', {
        available: true,
        email: 'james+test@example.com',
      });
      expect(messageFor('email')).toBe('Email is available');
    });

    // FE-REG-25
    it('debounces to one request per settled input', () => {
      for (const value of ['j', 'ja', 'jam', 'jame']) {
        type('username', value);
        vi.advanceTimersByTime(AVAILABILITY_DEBOUNCE_MS - 100);
      }
      http.expectNone((req) => req.url.startsWith(`${API}/check-username/`));

      type('username', 'james');
      answerCheck('check-username/james', { available: true, username: 'james' });
    });

    // FE-REG-26
    it('checks email case-insensitively and reports a mixed-case match as taken', () => {
      type('email', 'User@Example.com');
      answerCheck('check-email/user%40example.com', {
        available: false,
        email: 'user@example.com',
      });
      expect(messageFor('email')).toBe('Email already registered.');
    });
  });

  // FE-REG-27
  describe('rejected registration', () => {
    it.each([
      ['409 username conflict', 409, USERNAME_CONFLICT, 'username', 'Username already taken.'],
      ['409 email conflict', 409, EMAIL_CONFLICT, 'email', 'Email already registered.'],
      ['400 invalid details', 400, SIGNUP_INVALID, 'timezone', null],
    ] as const)(
      'stores no session and stays on /register (%s)',
      async (_label, status, body, field, fieldMessage) => {
        fillValidForm();
        submit();
        http.expectOne(`${API}/signup`).flush(body, { status, statusText: 'Error' });
        harness.detectChanges();

        if (fieldMessage) {
          expect(messageFor(field)).toBe(fieldMessage);
        } else {
          expect(el('[role="alert"]').textContent).toContain(body.error);
        }

        // No sign-in is attempted and nothing is kept in browser storage.
        http.expectNone(() => true);
        expect(storedValues()).toEqual([]);

        vi.useRealTimers();
        await harness.fixture.whenStable();
        expect(router.url).toBe('/register');
        expect(el('form')).toBeTruthy();
        expect(el<HTMLInputElement>('#username').value).toBe('james');
      },
    );
  });
});
