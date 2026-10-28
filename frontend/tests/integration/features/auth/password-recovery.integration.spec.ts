import { HttpParams, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../../src/app/app.routes';
import {
  type ResetTokenStatus,
  tokenStatusMessage,
} from '../../../../src/app/features/auth/reset-password/token-status-message.util';
import { provideSessionRestore } from '../../../../src/app/features/auth/session/auth.guards';
import { authInterceptor } from '../../../../src/app/features/auth/session/auth.interceptor';
import { SessionService } from '../../../../src/app/features/auth/session/session.service';
import { TOKEN_STORAGE_KEY } from '../../../../src/app/features/auth/session/token-storage.service';
import { environment } from '../../../../src/environments/environment';

/**
 * Password Recovery frontend integration tests (FE-REC-02 to FE-REC-22).
 *
 * The forgot- and reset-password pages are reached through the app's real routes and talk to
 * the API through the real AuthService, SessionService and authInterceptor. Only the network
 * is faked: HttpTestingController answers with the status codes and bodies the backend
 * returns (backend/src/features/auth/forgot-password and reset-password).
 */

const API = `${environment.apiBaseUrl}/api/auth`;
const NEW_PASSWORD = 'new-integration-password';
// Contains characters that must be URL-encoded in the validation request.
const RESET_TOKEN = 'reset+token/1=';
const SESSION_TOKEN = 'session-token';

// Response bodies copied from backend/src/features/auth.
const FORGOT_OK = { message: 'If an account exists for that email, a reset link has been sent.' };
const FORGOT_INVALID = {
  error: 'Invalid email address',
  details: [{ field: 'email', message: 'Invalid email address' }],
};
const TOKEN_VALID = { valid: true };
const tokenRejected = (reason: 'invalid' | 'expired' | 'used') => ({
  error: 'Reset token is invalid',
  reason,
});
const RESET_OK = { message: 'Password updated successfully.' };
const RESET_TOKEN_REJECTED = { error: 'This reset link is invalid or has expired.' };
const RESET_PASSWORD_REJECTED = {
  error: 'Invalid reset details',
  details: [{ field: 'newPassword', message: 'Password must be at least 8 characters' }],
};
const USER = {
  id: 'user-1',
  username: 'james',
  email: 'james@example.com',
  timezone: 'Asia/Manila',
  inboxProjectId: 1,
};

const OK = { status: 200, statusText: 'OK' };
const BAD_REQUEST = { status: 400, statusText: 'Bad Request' };

describe('Password Recovery integration (Forgot / Reset Password UI + API)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';
  const validateRequest = (token: string) => (req: { url: string; params: HttpParams }) =>
    req.url === `${API}/validate-reset-token` && req.params.get('token') === token;

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

  async function startApp(savedSessionToken?: string): Promise<void> {
    if (savedSessionToken) localStorage.setItem(TOKEN_STORAGE_KEY, savedSessionToken);

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
    harness = await RouterTestingHarness.create();
  }

  /** Opens the reset link from the email and answers the token check. */
  async function openResetLink(answer: object = TOKEN_VALID, init: object = OK): Promise<void> {
    await harness.navigateByUrl(`/reset-password?token=${encodeURIComponent(RESET_TOKEN)}`);
    const req = http.expectOne(validateRequest(RESET_TOKEN));
    expect(req.request.method).toBe('GET');
    req.flush(answer, init);
    await settle();
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => http.verify());

  describe('forgot password', () => {
    beforeEach(async () => {
      await startApp();
      await harness.navigateByUrl('/forgot-password');
    });

    // FE-REC-19
    it('posts only the entered email to POST /api/auth/forgot-password', () => {
      type('email', 'james@example.com');
      submit();

      const req = http.expectOne(`${API}/forgot-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'james@example.com' });
      req.flush(FORGOT_OK);
    });

    // FE-REC-04, FE-REC-05
    it.each(['james@example.com', 'nobody@example.com'])(
      'shows the same check-your-inbox confirmation for any 200 (%s)',
      async (email) => {
        type('email', email);
        submit();
        http.expectOne(`${API}/forgot-password`).flush(FORGOT_OK);
        await settle();

        expect(text('[role="status"]')).toBe(
          'If an account exists for that email, a reset link has been sent. Check your inbox.',
        );
        expect(el('form')).toBeNull();
      },
    );

    // FE-REC-02, FE-REC-03
    it.each([
      ['empty', ''],
      ['malformed', 'james@'],
    ])('sends no request for an %s email', (_label, email) => {
      type('email', email);
      submit();

      http.expectNone(`${API}/forgot-password`);
      expect(text('.field-error')).toBe('Enter a valid email address.');
    });

    // FE-REC-08
    it('shows the server error on a 400 and lets the user retry', async () => {
      type('email', 'james@example.com');
      submit();
      http.expectOne(`${API}/forgot-password`).flush(FORGOT_INVALID, BAD_REQUEST);
      await settle();

      expect(text('.error[role="alert"]')).toBe('Invalid email address');
      expect(el<HTMLButtonElement>('button[type="submit"]').disabled).toBe(false);

      submit();
      http.expectOne(`${API}/forgot-password`).flush(FORGOT_OK);
      await settle();
      expect(el('[role="status"]')).toBeTruthy();
    });

    // FE-REC-08
    it.each(['500', 'network'])('shows a retry message on a %s error', async (failure) => {
      type('email', 'james@example.com');
      submit();
      const req = http.expectOne(`${API}/forgot-password`);
      if (failure === 'network') req.error(new ProgressEvent('error'));
      else req.flush({ error: 'Internal server error' }, { status: 500, statusText: 'Error' });
      await settle();

      expect(text('.error[role="alert"]')).toBe(
        'We could not send the reset email. Please try again shortly.',
      );
      expect(el<HTMLButtonElement>('button[type="submit"]').disabled).toBe(false);
    });
  });

  describe('opening the reset link', () => {
    beforeEach(() => startApp());

    // FE-REC-20
    it('first validates the URL-encoded token while showing the checking state', async () => {
      await harness.navigateByUrl(`/reset-password?token=${encodeURIComponent(RESET_TOKEN)}`);

      const req = http.expectOne(validateRequest(RESET_TOKEN));
      expect(req.request.method).toBe('GET');
      // "+" must be encoded or the backend would read it as a space.
      expect(req.request.urlWithParams).toContain('token=reset%2Btoken');
      expect(text('h1')).toBe('Checking your reset link');
      expect(el('form')).toBeNull();

      req.flush(TOKEN_VALID);
      await settle();
    });

    // FE-REC-09, FE-REC-22
    it('shows the reset form only after {valid: true}', async () => {
      await openResetLink();

      expect(el('form')).toBeTruthy();
      expect(el('#password')).toBeTruthy();
      expect(el('#confirmation')).toBeTruthy();
      expect(el('.token-status')).toBeNull();
    });

    // FE-REC-10, FE-REC-11, FE-REC-22
    it.each(['expired', 'used', 'invalid'] as const)(
      'never shows the form for a %s token and offers a new link',
      async (reason) => {
        await openResetLink(tokenRejected(reason), BAD_REQUEST);

        expectTokenProblem(reason);
      },
    );

    it('treats a token check that fails on the network as an invalid link', async () => {
      await harness.navigateByUrl(`/reset-password?token=${encodeURIComponent(RESET_TOKEN)}`);
      http.expectOne(validateRequest(RESET_TOKEN)).error(new ProgressEvent('error'));
      await settle();

      expectTokenProblem('invalid');
    });

    // FE-REC-12
    it('sends no request and never shows the form when the token is missing', async () => {
      await harness.navigateByUrl('/reset-password');
      harness.detectChanges();

      http.expectNone((req) => req.url.startsWith(`${API}/validate-reset-token`));
      expectTokenProblem('missing');
    });

    function expectTokenProblem(status: ResetTokenStatus): void {
      const { title, message } = tokenStatusMessage(status);
      expect(el('form')).toBeNull();
      expect(text('.token-status h1')).toBe(title);
      expect(text('.token-status [role="alert"]')).toBe(message);
      const link = el<HTMLAnchorElement>('.token-status a');
      expect(link.textContent?.trim()).toBe('Request a new link');
      expect(link.getAttribute('href')).toBe('/forgot-password');
    }
  });

  describe('submitting a new password', () => {
    function fillPasswords(password: string, confirmation = password): void {
      type('password', password);
      type('confirmation', confirmation);
    }

    // FE-REC-21
    it('posts {token, newPassword, confirmPassword} to POST /api/auth/reset-password', async () => {
      await startApp();
      await openResetLink();
      fillPasswords(NEW_PASSWORD);
      submit();

      const req = http.expectOne(`${API}/reset-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        token: RESET_TOKEN,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      });
      req.flush(RESET_OK);
      await settle();
    });

    // FE-REC-14
    it('sends no request when the passwords do not match', async () => {
      await startApp();
      await openResetLink();
      fillPasswords(NEW_PASSWORD, `${NEW_PASSWORD}-typo`);
      submit();

      http.expectNone(`${API}/reset-password`);
      expect(text('.field-error')).toBe('Passwords do not match.');
    });

    // FE-REC-13
    it('sends no request when the password is under 8 characters', async () => {
      await startApp();
      await openResetLink();
      fillPasswords('short7!');
      submit();

      http.expectNone(`${API}/reset-password`);
      expect(text('.field-error')).toBe('Password must be at least 8 characters.');
    });

    // FE-REC-15, FE-REC-18
    it('clears the stored session and redirects to /login with a success message', async () => {
      await startApp(SESSION_TOKEN);
      http.expectOne(`${API}/me`).flush(USER);
      const session = TestBed.inject(SessionService);
      const clear = vi.spyOn(session, 'clear');

      await openResetLink();
      expect(session.currentUser()).toEqual(USER);
      fillPasswords(NEW_PASSWORD);
      submit();
      http.expectOne(`${API}/reset-password`).flush(RESET_OK);
      await settle();

      expect(clear).toHaveBeenCalledTimes(1);
      expect(session.currentUser()).toBeNull();
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(router.parseUrl(router.url).root.children['primary'].segments.join('/')).toBe('login');
      expect(text('.form-notice[role="status"]')).toBe(
        'Your password has been updated. Log in with your new password.',
      );
    });

    // FE-REC-16
    it('shows the expired message and a new-link link when the server rejects the token', async () => {
      await startApp();
      await openResetLink();
      fillPasswords(NEW_PASSWORD);
      submit();
      http.expectOne(`${API}/reset-password`).flush(RESET_TOKEN_REJECTED, BAD_REQUEST);
      await settle();

      const { title, message } = tokenStatusMessage('expired');
      expect(el('form')).toBeNull();
      expect(text('.token-status h1')).toBe(title);
      expect(text('.token-status [role="alert"]')).toBe(message);
      expect(el('.token-status a').getAttribute('href')).toBe('/forgot-password');
    });

    it('keeps the form and shows a retry message on a server error', async () => {
      await startApp();
      await openResetLink();
      fillPasswords(NEW_PASSWORD);
      submit();
      http
        .expectOne(`${API}/reset-password`)
        .flush({ error: 'Internal server error' }, { status: 500, statusText: 'Error' });
      await settle();

      expect(el('form')).toBeTruthy();
      expect(text('.error[role="alert"]')).toBe(
        'We could not update your password. Please try again.',
      );
    });

    // FE-REC-17
    it('disables the button and shows the loading label while saving, sending one request', async () => {
      await startApp();
      await openResetLink();
      fillPasswords(NEW_PASSWORD);
      submit();

      const button = el<HTMLButtonElement>('button[type="submit"]');
      expect(button.disabled).toBe(true);
      expect(button.textContent?.trim()).toBe('Updating…');

      // A second submit while the first is running sends nothing.
      submit();
      http
        .expectOne(`${API}/reset-password`)
        .flush({ error: 'Internal server error' }, { status: 500, statusText: 'Error' });
      await settle();

      expect(el<HTMLButtonElement>('button[type="submit"]').disabled).toBe(false);
      expect(text('button[type="submit"]')).toBe('Update password');
    });

    it('shows the server message and keeps the form when the server rejects the password', async () => {
      await startApp();
      await openResetLink();
      fillPasswords(NEW_PASSWORD);
      submit();
      http.expectOne(`${API}/reset-password`).flush(RESET_PASSWORD_REJECTED, BAD_REQUEST);
      await settle();

      expect(el('form')).toBeTruthy();
      expect(el('.token-status')).toBeNull();
      expect(text('.error[role="alert"]')).toBe('Password must be at least 8 characters');
    });

    it('shows required messages and sends no request when both fields are empty', async () => {
      await startApp();
      await openResetLink();
      submit();

      http.expectNone(`${API}/reset-password`);
      const errors = [...page().querySelectorAll('.field-error')].map((e) => e.textContent?.trim());
      expect(errors).toEqual(['Enter a new password.', 'Confirm your new password.']);
    });
  });

  it('never keeps the password or reset token in browser storage or the URL', async () => {
    await startApp();
    await openResetLink();
    expect(router.url).not.toContain('token');

    type('password', NEW_PASSWORD);
    type('confirmation', NEW_PASSWORD);
    submit();
    http.expectOne(`${API}/reset-password`).flush(RESET_OK);
    await settle();

    const stored = storedValues().join('\n');
    expect(stored).not.toContain(NEW_PASSWORD);
    expect(stored).not.toContain(RESET_TOKEN);
    expect(router.url).not.toContain(encodeURIComponent(RESET_TOKEN));
  });
});
