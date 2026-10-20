import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Login, POST_LOGIN_REDIRECT } from './login';
import { TOKEN_STORAGE_KEY } from './services/login.service';

const LOGIN_URL = `${environment.apiBaseUrl}/api/auth/login`;
const LOGIN_RESPONSE = {
  token: 'session-token',
  user: {
    id: 'u-1',
    username: 'james',
    email: 'james@example.com',
    timezone: 'Asia/Manila',
    inboxProjectId: 1,
  },
};

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  let page: HTMLElement;
  let navigate: ReturnType<typeof vi.spyOn>;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T;
  const messageFor = (id: string) => el(`#${id}-status`).textContent?.trim() ?? '';
  const submitButton = () => el<HTMLButtonElement>('button[type="submit"]');

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

  function fail(status: number): void {
    http.expectOne(LOGIN_URL).flush({ error: 'Server message' }, { status, statusText: 'Error' });
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('renders the identifier, password, remember option, submit button and links', () => {
    for (const id of ['identifier', 'password']) {
      expect(el(`#${id}`)).toBeTruthy();
      expect(el(`label[for="${id}"]`)).toBeTruthy();
    }
    expect(el<HTMLInputElement>('input[type="checkbox"]').checked).toBe(false);
    expect(submitButton().textContent).toContain('Log in');
    expect(el('a.forgot').getAttribute('href')).toBe('/forgot-password');
    expect(el('.switch a').getAttribute('href')).toBe('/register');
  });

  it('shows required errors and makes no request when submitted empty', () => {
    submit();

    expect(messageFor('identifier')).toBe('Email or username is required.');
    expect(messageFor('password')).toBe('Password is required.');
    http.expectNone(LOGIN_URL);
  });

  it('logs in with an email, stores the token and navigates', () => {
    type('identifier', '  james@example.com ');
    type('password', 'password123');
    submit();

    const req = http.expectOne(LOGIN_URL);
    expect(req.request.body).toEqual({ identifier: 'james@example.com', password: 'password123' });
    req.flush(LOGIN_RESPONSE);

    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe('session-token');
    expect(navigate).toHaveBeenCalledWith(POST_LOGIN_REDIRECT);
  });

  it('logs in with a username and remembers the device when asked', () => {
    type('identifier', 'james');
    type('password', 'password123');
    el<HTMLInputElement>('input[type="checkbox"]').click();
    submit();

    const req = http.expectOne(LOGIN_URL);
    expect(req.request.body).toEqual({ identifier: 'james', password: 'password123' });
    req.flush(LOGIN_RESPONSE);

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('session-token');
    expect(navigate).toHaveBeenCalledWith(POST_LOGIN_REDIRECT);
  });

  it('shows one generic message on 401 and clears only the password', () => {
    type('identifier', 'james');
    type('password', 'wrong-password');
    submit();
    fail(401);

    expect(el('[role="alert"]').textContent).toContain('Incorrect email/username or password.');
    expect(el<HTMLInputElement>('#password').value).toBe('');
    expect(el<HTMLInputElement>('#identifier').value).toBe('james');
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('disables the button while logging in and ignores duplicate submits', () => {
    type('identifier', 'james');
    type('password', 'password123');
    submit();

    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain('Logging in…');

    submit();
    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
  });

  it('shows a generic error on a server failure and lets the user retry', () => {
    type('identifier', 'james');
    type('password', 'password123');
    submit();
    fail(500);

    expect(el('[role="alert"]').textContent).toContain('Something went wrong');
    expect(el<HTMLInputElement>('#password').value).toBe('password123');
    expect(submitButton().disabled).toBe(false);

    submit();
    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    expect(navigate).toHaveBeenCalledWith(POST_LOGIN_REDIRECT);
  });

  it('toggles password visibility', () => {
    const input = el<HTMLInputElement>('#password');
    const toggle = el<HTMLButtonElement>('.toggle');
    expect(input.type).toBe('password');

    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the fields in a logical keyboard order inside one form', () => {
    const focusable = Array.from(el('form').querySelectorAll<HTMLElement>('input, button')).map(
      (node) => node.id || node.className || node.getAttribute('type'),
    );

    expect(focusable).toEqual(['identifier', 'password', 'toggle', 'remember', 'submit']);
  });
});
