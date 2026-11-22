import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AVAILABILITY_DEBOUNCE_MS, DEFAULT_TIMEZONE, Register } from './register';

const API = `${environment.apiBaseUrl}/api/auth`;

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let http: HttpTestingController | undefined;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T;
  const messageFor = (id: string) => el(`#${id}-status`).textContent?.trim() ?? '';

  function controller(): HttpTestingController {
    if (!http) {
      throw new Error('HTTP testing controller was not initialized');
    }
    return http;
  }

  function type(id: string, value: string): void {
    const input = el<HTMLInputElement>(`#${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  function submit(): void {
    el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  /** Lets the availability debounce elapse and answers the check request. */
  function answerCheck(path: string, body: object, status = 200): void {
    vi.advanceTimersByTime(AVAILABILITY_DEBOUNCE_MS);
    const req = controller().expectOne(`${API}/${path}`);
    if (status === 200) {
      req.flush(body);
    } else {
      req.flush(body, { status, statusText: 'Error' });
    }
    fixture.detectChanges();
  }

  function fillValidForm(): void {
    type('username', 'james');
    answerCheck('check-username/james', { available: true });
    type('email', 'james@example.com');
    answerCheck('check-email/james%40example.com', { available: true });
    type('password', 'password123');
    type('confirmPassword', 'password123');
  }

  beforeEach(async () => {
    http = undefined;
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Register);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    try {
      http?.verify();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders every field with labels and defaults the timezone to Asia/Manila', () => {
    for (const id of ['username', 'email', 'password', 'confirmPassword', 'timezone']) {
      expect(el(`#${id}`)).toBeTruthy();
      expect(el(`label[for="${id}"]`)).toBeTruthy();
    }
    expect(el<HTMLSelectElement>('#timezone').value).toBe(DEFAULT_TIMEZONE);
    expect(el('button[type="submit"]').textContent).toContain('Create account');
  });

  it('shows required errors and makes no request when submitted empty', () => {
    submit();

    expect(messageFor('username')).toBe('Username is required.');
    expect(messageFor('email')).toBe('Email is required.');
    expect(messageFor('password')).toBe('Password is required.');
    expect(messageFor('confirmPassword')).toBe('Confirm your password.');
    controller().expectNone(`${API}/signup`);
  });

  it('rejects a malformed email', () => {
    type('email', 'user@');
    expect(messageFor('email')).toBe('Enter a valid email address.');
  });

  it('rejects a username over 50 characters', () => {
    type('username', 'a'.repeat(51));
    expect(messageFor('username')).toBe('Must be 50 characters or fewer.');
  });

  it('rejects a username with invalid characters', () => {
    type('username', 'james saluta!');
    expect(messageFor('username')).toContain('Username format is invalid');
  });

  it('enforces the 8-character password minimum', () => {
    type('password', 'short');
    expect(messageFor('password')).toBe('Password must be at least 8 characters.');
  });

  it('shows an error when the passwords do not match', () => {
    type('password', 'password123');
    type('confirmPassword', 'password124');
    expect(messageFor('confirmPassword')).toBe('Passwords do not match.');
  });

  it('shows an indicator when the username is available', () => {
    type('username', 'james');
    expect(messageFor('username')).toBe('Checking availability…');

    answerCheck('check-username/james', { available: true });
    expect(messageFor('username')).toBe('Username is available');
  });

  it('shows an error when the username is taken', () => {
    type('username', 'james');
    answerCheck('check-username/james', { available: false });
    expect(messageFor('username')).toBe('Username already taken.');
  });

  it('URL-encodes and lowercases the email check, and reports a taken email', () => {
    type('email', 'User+1@Example.com');
    answerCheck('check-email/user%2B1%40example.com', { available: false });
    expect(messageFor('email')).toBe('Email already registered.');
  });

  it('debounces availability checks to one request per settled input', () => {
    type('username', 'j');
    vi.advanceTimersByTime(100);
    type('username', 'ja');
    vi.advanceTimersByTime(100);
    type('username', 'jam');

    answerCheck('check-username/jam', { available: true });
  });

  it('shows the API message when an availability check returns 400', () => {
    type('email', 'a@b');
    answerCheck(
      'check-email/a%40b',
      { error: 'Email must be valid and no longer than 255 characters' },
      400,
    );
    expect(messageFor('email')).toBe('Email must be valid and no longer than 255 characters');
  });

  it('does not block the user when an availability check fails', () => {
    type('username', 'james');
    answerCheck('check-username/james', { error: 'Internal server error' }, 500);
    expect(messageFor('username')).toBe('');
  });

  it('sends the signup payload and disables the button while it runs', () => {
    fillValidForm();
    submit();

    const req = controller().expectOne(`${API}/signup`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      username: 'james',
      email: 'james@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      timezone: DEFAULT_TIMEZONE,
    });

    const button = el<HTMLButtonElement>('button[type="submit"]');
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Creating account…');

    submit();
    controller().expectNone(`${API}/signup`);

    req.flush({ userId: 'u-1', inboxProjectId: 1 }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    expect(page.textContent).toContain('Account created');
  });

  it('shows a 409 conflict on the relevant field and keeps the values', () => {
    fillValidForm();
    submit();
    controller()
      .expectOne(`${API}/signup`)
      .flush({ error: 'Email is already in use' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(messageFor('email')).toBe('Email already registered.');
    expect(el<HTMLInputElement>('#email').value).toBe('james@example.com');
    expect(el<HTMLButtonElement>('button[type="submit"]').disabled).toBe(false);
  });

  it('shows the server message on a 400 and keeps the values', () => {
    fillValidForm();
    submit();
    controller()
      .expectOne(`${API}/signup`)
      .flush(
        {
          error: 'Invalid signup details',
          details: [{ field: 'timezone', message: 'Must be a valid IANA timezone' }],
        },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();

    expect(el('[role="alert"]').textContent).toContain('Invalid signup details');
    expect(el<HTMLInputElement>('#username').value).toBe('james');
  });

  it('shows a generic error on a 500 and lets the user retry', () => {
    fillValidForm();
    submit();
    controller()
      .expectOne(`${API}/signup`)
      .flush({ error: 'Internal server error' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el('[role="alert"]').textContent).toContain('Something went wrong');
    expect(el<HTMLButtonElement>('button[type="submit"]').disabled).toBe(false);
  });

  it('toggles password visibility', () => {
    const input = el<HTMLInputElement>('#password');
    const toggle = input.parentElement!.querySelector('button') as HTMLButtonElement;
    expect(input.type).toBe('password');

    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('links to the login page', () => {
    const link = el<HTMLAnchorElement>('.switch a');
    expect(link.textContent).toContain('Log in');
    expect(link.getAttribute('href')).toBe('/login');
  });
});
