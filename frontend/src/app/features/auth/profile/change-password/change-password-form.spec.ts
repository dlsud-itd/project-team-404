import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ChangePasswordForm } from './change-password-form';

const URL = `${environment.apiBaseUrl}/api/auth/profile/password`;

describe('ChangePasswordForm', () => {
  let fixture: ComponentFixture<ChangePasswordForm>;
  let http: HttpTestingController;

  const el = <T extends HTMLElement>(selector: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(selector) as T;
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';
  const messageFor = (id: string) => text(`#${id}-status`);
  const submitButton = () => el<HTMLButtonElement>('button[type="submit"]');

  function type(id: string, value: string): void {
    const input = el<HTMLInputElement>(`#${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  function fillValid(): void {
    type('current-password', 'old-password');
    type('new-password', 'new-password');
    type('confirm-password', 'new-password');
  }

  function submit(): void {
    el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ChangePasswordForm);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('labels every password field and hides the passwords', () => {
    for (const id of ['current-password', 'new-password', 'confirm-password']) {
      expect(el(`label[for="${id}"]`)).toBeTruthy();
      expect(el<HTMLInputElement>(`#${id}`).type).toBe('password');
    }
    expect(el('#current-password').getAttribute('autocomplete')).toBe('current-password');
    expect(el('#new-password').getAttribute('autocomplete')).toBe('new-password');
  });

  it('shows and hides a password with its toggle', () => {
    const toggle = el<HTMLButtonElement>('#new-password + .toggle');
    toggle.click();
    fixture.detectChanges();
    expect(el<HTMLInputElement>('#new-password').type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    toggle.click();
    fixture.detectChanges();
    expect(el<HTMLInputElement>('#new-password').type).toBe('password');
  });

  it('keeps the button disabled until every field is valid', () => {
    expect(submitButton().disabled).toBe(true);
    type('current-password', 'old-password');
    type('new-password', 'new-password');
    expect(submitButton().disabled).toBe(true);
    type('confirm-password', 'new-password');
    expect(submitButton().disabled).toBe(false);
  });

  it('shows a short password, a mismatch and a reused password', () => {
    type('current-password', 'old-password');
    type('new-password', 'short');
    expect(messageFor('new-password')).toBe('Password must be at least 8 characters.');

    type('new-password', 'old-password');
    expect(messageFor('new-password')).toBe(
      'New password must be different from the current password.',
    );

    type('new-password', 'new-password');
    type('confirm-password', 'different');
    expect(messageFor('confirm-password')).toBe('Passwords do not match.');
    expect(submitButton().disabled).toBe(true);
  });

  it('shows required messages after leaving empty fields', () => {
    type('current-password', '');
    expect(messageFor('current-password')).toBe('Enter your current password.');
  });

  it('sends the passwords, then clears the form and confirms', () => {
    fillValid();
    submit();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      currentPassword: 'old-password',
      newPassword: 'new-password',
      confirmPassword: 'new-password',
    });
    expect(submitButton().textContent?.trim()).toBe('Changing…');

    req.flush({ message: 'Password changed successfully' });
    fixture.detectChanges();

    expect(text('.form-notice')).toBe("Password changed. You've been signed out on other devices.");
    for (const id of ['current-password', 'new-password', 'confirm-password']) {
      expect(el<HTMLInputElement>(`#${id}`).value).toBe('');
      expect(messageFor(id)).toBe('');
    }
  });

  it('shows a wrong current password under that field, without logging out', () => {
    fillValid();
    submit();
    http.expectOne(URL).flush(
      {
        error: 'Current password is incorrect',
        details: [{ field: 'currentPassword', message: 'Current password is incorrect' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(messageFor('current-password')).toBe('Current password is incorrect');
    expect(el('#current-password').getAttribute('aria-invalid')).toBe('true');
    expect(el<HTMLInputElement>('#new-password').value).toBe('new-password');

    type('current-password', 'another-try');
    expect(messageFor('current-password')).toBe('');
  });

  it('shows a general error above the form for a server failure', () => {
    fillValid();
    submit();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(text('.form-error')).toBe('Something went wrong. Please try again.');
  });
});
