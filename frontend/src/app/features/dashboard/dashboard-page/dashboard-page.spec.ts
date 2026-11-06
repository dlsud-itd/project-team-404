import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { authGuard } from '../../auth/session/auth.guards';
import { SessionService } from '../../auth/session/session.service';
import { DASHBOARD_ROUTES } from '../dashboard.routes';
import { DashboardPage } from './dashboard-page';

const URL = `${environment.apiBaseUrl}/api/dashboard/current-upcoming-tasks?days=7`;
const OVERDUE_URL = `${environment.apiBaseUrl}/api/dashboard/overdue-tasks`;
const PROJECTS_URL = `${environment.apiBaseUrl}/api/projects`;

describe('DashboardPage', () => {
  let http: HttpTestingController;
  const user = signal<{ username: string; timezone: string } | null>(null);

  function setup(): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard', canActivate: [authGuard], loadChildren: () => DASHBOARD_ROUTES },
          { path: 'login', children: [] },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionService,
          useValue: {
            currentUser: user,
            isAuthenticated: () => user() !== null,
            restore: () => Promise.resolve(),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    http.verify();
    user.set(null);
  });

  it('renders at /dashboard for a signed-in user with the Current & Upcoming and Overdue sections', async () => {
    user.set({ username: 'james', timezone: 'Asia/Manila' });
    setup();
    const harness = await RouterTestingHarness.create();

    const page = await harness.navigateByUrl('/dashboard', DashboardPage);
    http.expectOne(URL).flush({ tasks: [] });
    http.expectOne(OVERDUE_URL).flush({ tasks: [] });
    http.expectOne(PROJECTS_URL).flush([]);
    harness.detectChanges();

    const el = harness.routeNativeElement as HTMLElement;
    expect(page).toBeInstanceOf(DashboardPage);
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Dashboard');
    expect(el.querySelector('.greeting')?.textContent?.trim()).toBe('Welcome back, james.');
    expect(el.querySelector('app-current-upcoming-tasks h2')?.textContent?.trim()).toBe(
      'Current & Upcoming',
    );
    expect(el.querySelector('app-overdue-tasks h2')?.textContent).toContain('Overdue');
    expect(document.title).toBe('Dashboard · HabitTracker');
  });

  it('sends signed-out visitors to the login page', async () => {
    setup();
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/dashboard');

    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
