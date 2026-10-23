import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { LoginService } from '../../login/services/login.service';
import type { LoginResponse } from '../../login/types/login.types';
import { SessionService } from '../../session/session.service';
import type { Profile } from '../types/profile.types';
import { ProfileSettings } from './profile-settings';

const URL = `${environment.apiBaseUrl}/api/auth/profile`;
const PROFILE: Profile = { id: '1', username: 'james', timezone: 'Asia/Manila' };
const LOGIN: LoginResponse = {
  token: 'token',
  user: {
    id: '1',
    username: 'james',
    email: 'james@example.com',
    timezone: 'Asia/Manila',
    inboxProjectId: 1,
  },
};

describe('ProfileSettings', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let session: SessionService;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';
  const messageFor = (id: string) => text(`#profile-${id}-status`);
  const saveButton = () => el<HTMLButtonElement>('button[type="submit"]');

  function type(value: string): void {
    const input = el<HTMLInputElement>('#profile-username');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    harness.detectChanges();
  }

  function pickTimezone(value: string): void {
    const select = el<HTMLSelectElement>('#profile-timezone');
    select.value = value;
    select.dispatchEvent(new Event('change'));
    harness.detectChanges();
  }

  function submit(): void {
    el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    harness.detectChanges();
  }

  function loadProfile(profile: Profile = PROFILE): void {
    http.expectOne(URL).flush(profile);
    harness.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'settings/profile', component: ProfileSettings }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LoginService, useValue: { login: () => of(LOGIN) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    session.login({ identifier: 'james', password: 'password' }, false).subscribe();
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/settings/profile');
  });

  afterEach(() => http.verify());

  it('shows a loading message, then the saved profile', () => {
    expect(text('[role="status"]')).toBe('Loading your profile…');
    loadProfile();

    expect(el<HTMLInputElement>('#profile-username').value).toBe('james');
    expect(el<HTMLSelectElement>('#profile-timezone').value).toBe('Asia/Manila');
    expect(el<HTMLInputElement>('#profile-email').value).toBe('james@example.com');
    expect(el<HTMLInputElement>('#profile-email').readOnly).toBe(true);
  });

  it('labels every field', () => {
    loadProfile();
    for (const id of ['profile-email', 'profile-username', 'profile-timezone']) {
      expect(el(`label[for="${id}"]`)).toBeTruthy();
    }
  });

  it('offers a retry when the profile cannot be loaded', () => {
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Error' });
    harness.detectChanges();
    expect(text('[role="alert"]')).toContain("Couldn't load your profile");

    el<HTMLButtonElement>('.message button').click();
    harness.detectChanges();
    loadProfile();
    expect(el('form')).toBeTruthy();
  });

  it('keeps Save disabled until a field changes', () => {
    loadProfile();
    expect(saveButton().disabled).toBe(true);

    type('saluta');
    expect(saveButton().disabled).toBe(false);

    type('james');
    expect(saveButton().disabled).toBe(true);
  });

  it('shows format and length errors and keeps Save disabled', () => {
    loadProfile();
    type('james saluta!');
    expect(messageFor('username')).toContain('Username format is invalid');
    expect(saveButton().disabled).toBe(true);

    type('a'.repeat(51));
    expect(messageFor('username')).toBe('Use 50 characters or fewer.');

    type('');
    expect(messageFor('username')).toBe('Username is required.');
  });

  it('sends only the changed fields and shows a confirmation', () => {
    loadProfile();
    pickTimezone('Europe/London');
    submit();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ timezone: 'Europe/London' });
    expect(saveButton().textContent?.trim()).toBe('Saving…');

    req.flush({ ...PROFILE, timezone: 'Europe/London' });
    harness.detectChanges();

    expect(text('.form-notice')).toBe('Profile updated.');
    expect(saveButton().disabled).toBe(true);
  });

  it('updates the session username after saving', () => {
    loadProfile();
    type('saluta');
    submit();
    http.expectOne(URL).flush({ ...PROFILE, username: 'saluta' });
    harness.detectChanges();

    expect(session.currentUser()?.username).toBe('saluta');
    expect(el<HTMLInputElement>('#profile-username').value).toBe('saluta');
  });

  it('shows a taken username under the field and clears it when the user types', () => {
    loadProfile();
    type('taken');
    submit();
    http
      .expectOne(URL)
      .flush({ error: 'Username is already in use' }, { status: 409, statusText: 'Conflict' });
    harness.detectChanges();

    expect(messageFor('username')).toBe('Username already taken.');
    expect(el('#profile-username').getAttribute('aria-invalid')).toBe('true');
    expect(el<HTMLInputElement>('#profile-username').value).toBe('taken');

    type('taken2');
    expect(messageFor('username')).toBe('');
  });

  it('shows a general error above the form for a server failure', () => {
    loadProfile();
    type('saluta');
    submit();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Error' });
    harness.detectChanges();

    expect(text('.form-error')).toBe('Something went wrong. Please try again.');
  });
});
