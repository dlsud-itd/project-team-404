import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import type { UserSettings } from '../types/user-settings.types';
import { SettingsService } from './settings.service';

const URL = `${environment.apiBaseUrl}/api/settings`;

const SETTINGS: UserSettings = {
  dashboardTaskLimit: 8,
  dashboardProjectLimit: 5,
  fontSize: 'large',
  fontFamily: 'serif',
  updatedAt: '2026-11-10T09:35:00.000Z',
};

describe('SettingsService', () => {
  let service: SettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets the user’s settings', () => {
    let result: UserSettings | undefined;
    service.get().subscribe((settings) => (result = settings));

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.body).toBeNull();
    req.flush(SETTINGS);
    expect(result).toEqual(SETTINGS);
  });

  it('patches only the given fields and returns every setting', () => {
    let result: UserSettings | undefined;
    service
      .update({ dashboardTaskLimit: 8, fontSize: 'large', fontFamily: 'serif' })
      .subscribe((settings) => (result = settings));

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      dashboardTaskLimit: 8,
      fontSize: 'large',
      fontFamily: 'serif',
    });
    req.flush(SETTINGS);
    expect(result).toEqual(SETTINGS);
  });

  it('passes errors through', () => {
    let failure: unknown;
    service.update({ dashboardTaskLimit: 99 }).subscribe({ error: (e: unknown) => (failure = e) });
    http
      .expectOne(URL)
      .flush({ error: 'Limit outside 1-50' }, { status: 400, statusText: 'Bad Request' });
    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect((failure as HttpErrorResponse).status).toBe(400);
  });
});
