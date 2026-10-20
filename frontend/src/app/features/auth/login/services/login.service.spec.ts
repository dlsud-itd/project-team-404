import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import type { LoginResponse } from '../types/login.types';
import { LoginService, TOKEN_STORAGE_KEY } from './login.service';

const LOGIN_URL = `${environment.apiBaseUrl}/api/auth/login`;
const RESPONSE: LoginResponse = {
  token: 'session-token',
  user: {
    id: 'u-1',
    username: 'james',
    email: 'james@example.com',
    timezone: 'Asia/Manila',
    inboxProjectId: 1,
  },
};

describe('LoginService', () => {
  let service: LoginService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LoginService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts only the identifier and password', () => {
    service.login({ identifier: 'james', password: 'password123' }, false).subscribe();

    const req = http.expectOne(LOGIN_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ identifier: 'james', password: 'password123' });
    req.flush(RESPONSE);
  });

  it('keeps the token for this tab only when "remember" is off', () => {
    service.login({ identifier: 'james', password: 'password123' }, false).subscribe();
    http.expectOne(LOGIN_URL).flush(RESPONSE);

    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe('session-token');
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('keeps the token on this device when "remember" is on', () => {
    service.login({ identifier: 'james', password: 'password123' }, true).subscribe();
    http.expectOne(LOGIN_URL).flush(RESPONSE);

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('session-token');
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('never stores the password', () => {
    service.login({ identifier: 'james', password: 'password123' }, true).subscribe();
    http.expectOne(LOGIN_URL).flush(RESPONSE);

    const stored = JSON.stringify({ ...localStorage, ...sessionStorage });
    expect(stored).not.toContain('password123');
  });

  it('stores nothing when the login is rejected', () => {
    service.login({ identifier: 'james', password: 'wrong' }, true).subscribe({ error: () => {} });
    http
      .expectOne(LOGIN_URL)
      .flush({ error: 'Invalid email or password' }, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});
