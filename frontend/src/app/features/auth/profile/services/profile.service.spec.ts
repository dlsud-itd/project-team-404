import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { LoginService } from '../../login/services/login.service';
import type { LoginResponse } from '../../login/types/login.types';
import { SessionService } from '../../session/session.service';
import type { Profile } from '../types/profile.types';
import { ProfileService } from './profile.service';

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

describe('ProfileService', () => {
  let service: ProfileService;
  let session: SessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LoginService, useValue: { login: () => of(LOGIN) } },
      ],
    });
    service = TestBed.inject(ProfileService);
    session = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
    session.login({ identifier: 'james', password: 'password' }, false).subscribe();
  });

  afterEach(() => http.verify());

  it('gets the profile', () => {
    let result: Profile | undefined;
    service.get().subscribe((profile) => (result = profile));

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('GET');
    req.flush(PROFILE);

    expect(result).toEqual(PROFILE);
  });

  it('patches only the changed fields', () => {
    service.update({ username: 'saluta' }).subscribe();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ username: 'saluta' });
    req.flush({ ...PROFILE, username: 'saluta' });
  });

  it('updates the session user after a save, keeping the other details', () => {
    service.update({ username: 'saluta', timezone: 'Europe/London' }).subscribe();
    http.expectOne(URL).flush({ id: '1', username: 'saluta', timezone: 'Europe/London' });

    expect(session.currentUser()).toEqual({
      ...LOGIN.user,
      username: 'saluta',
      timezone: 'Europe/London',
    });
  });

  it('posts a password change', () => {
    const body = {
      currentPassword: 'old-password',
      newPassword: 'new-password',
      confirmPassword: 'new-password',
    };
    let result: { message: string } | undefined;
    service.changePassword(body).subscribe((response) => (result = response));

    const req = http.expectOne(`${URL}/password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ message: 'Password changed successfully' });

    expect(result).toEqual({ message: 'Password changed successfully' });
  });

  it('leaves the session user alone when the save fails', () => {
    service.update({ username: 'taken' }).subscribe({ error: () => {} });
    http.expectOne(URL).flush(
      { error: 'Username is already in use' },
      {
        status: 409,
        statusText: 'Conflict',
      },
    );

    expect(session.currentUser()?.username).toBe('james');
  });
});
