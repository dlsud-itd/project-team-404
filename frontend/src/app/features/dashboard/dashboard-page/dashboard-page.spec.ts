import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { authGuard } from '../../auth/session/auth.guards';
import { SessionService } from '../../auth/session/session.service';
import { addDays, toDateKey } from '../current-upcoming-tasks/utils/group-by-day.util';
import { DASHBOARD_ROUTES } from '../dashboard.routes';
import type { DashboardSummary } from '../shared/types/dashboard.types';
import { dashboardTask, tasksResponse } from '../testing/helpers/dashboard-task';
import { DashboardPage } from './dashboard-page';

@Component({ template: '' })
class Blank {}

const URL = `${environment.apiBaseUrl}/api/dashboard`;
const TASKS_URL = `${URL}/tasks`;
const COUNTS: DashboardSummary = {
  currentCount: 2,
  upcomingCount: 5,
  overdueCount: 1,
  completedCount: 12,
};

describe('DashboardPage', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;
  const signedIn = signal(true);

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';
  const tile = (key: keyof DashboardSummary) => ({
    value: text(`[data-tile="${key}"] .value`),
    label: text(`[data-tile="${key}"] .label`),
  });
  const summaryRequest = () => http.expectOne(URL);
  const tasksRequest = () => http.expectOne((r) => r.url === TASKS_URL);

  async function open(): Promise<void> {
    await harness.navigateByUrl('/dashboard');
    summaryRequest().flush(COUNTS);
    tasksRequest().flush(
      tasksResponse([
        dashboardTask({ title: 'Due today', status: 'current', dueDate: toDateKey(new Date()) }),
        dashboardTask({ title: 'Due tomorrow', dueDate: addDays(new Date(), 1) }),
      ]),
    );
    harness.detectChanges();
  }

  beforeEach(async () => {
    signedIn.set(true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          // Mirrors the /dashboard entry in app.routes.ts.
          {
            path: 'dashboard',
            canActivate: [authGuard],
            loadChildren: () => import('../dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
          },
          { path: 'home', component: Blank },
          { path: 'login', component: Blank },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SessionService,
          useValue: { restore: () => Promise.resolve(), isAuthenticated: signedIn },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  it('is lazy-loaded at /dashboard with its own title', async () => {
    const component = await harness.navigateByUrl('/dashboard');

    expect(DASHBOARD_ROUTES.map((r) => r.path)).toEqual(['']);
    expect(component).toBeInstanceOf(DashboardPage);
    expect(document.title).toBe('Dashboard · HabitTracker');
    summaryRequest().flush(COUNTS);
    tasksRequest().flush(tasksResponse([]));
  });

  it('sends signed-out users to the login page', async () => {
    signedIn.set(false);

    await harness.navigateByUrl('/dashboard');

    expect(router.url).toBe('/login');
    http.expectNone(URL);
  });

  it('shows placeholders until the counts arrive', async () => {
    await harness.navigateByUrl('/dashboard');

    expect(text('h1')).toBe('Dashboard');
    expect(tile('currentCount').value).toBe('–');
    expect(el('.summary').getAttribute('aria-busy')).toBe('true');
    summaryRequest().flush(COUNTS);
    tasksRequest().flush(tasksResponse([]));
  });

  it('shows the four task counts', async () => {
    await open();

    expect(tile('currentCount')).toEqual({ value: '2', label: 'Due today' });
    expect(tile('upcomingCount')).toEqual({ value: '5', label: 'Upcoming' });
    expect(tile('overdueCount')).toEqual({ value: '1', label: 'Overdue' });
    expect(tile('completedCount')).toEqual({ value: '12', label: 'Completed' });
    expect(el('.summary').getAttribute('aria-busy')).toBe('false');
  });

  it('shows zero counts as 0, not as placeholders', async () => {
    await harness.navigateByUrl('/dashboard');
    summaryRequest().flush({
      currentCount: 0,
      upcomingCount: 0,
      overdueCount: 0,
      completedCount: 0,
    });
    tasksRequest().flush(tasksResponse([]));
    harness.detectChanges();

    expect(tile('overdueCount').value).toBe('0');
  });

  it('hosts the Current & upcoming section', async () => {
    await open();

    expect(text('app-current-upcoming-tasks h2')).toBe('Current & upcoming');
    expect(text('[data-day="today"] .title')).toBe('Due today');
    expect(text('[data-day="tomorrow"] .title')).toBe('Due tomorrow');
  });

  it('shows a counts failure with a retry, without hiding the tasks', async () => {
    await harness.navigateByUrl('/dashboard');
    summaryRequest().flush(null, { status: 500, statusText: 'Error' });
    tasksRequest().flush(tasksResponse([]));
    harness.detectChanges();

    expect(text('.load-error p')).toBe(
      "Couldn't load your task counts. Something went wrong. Please try again.",
    );
    expect(text('app-current-upcoming-tasks .empty-title')).toBe("You're all caught up.");

    el<HTMLButtonElement>('.retry').click();
    summaryRequest().flush(COUNTS);
    harness.detectChanges();

    expect(el('.load-error')).toBeNull();
    expect(tile('upcomingCount').value).toBe('5');
    http.expectNone((r) => r.url === TASKS_URL);
  });

  it('keeps the last counts when a reload fails', async () => {
    await open();

    el<HTMLButtonElement>('.refresh').click();
    summaryRequest().flush(null, { status: 500, statusText: 'Error' });
    tasksRequest().flush(tasksResponse([]));
    harness.detectChanges();

    expect(el('.load-error')).toBeTruthy();
    expect(tile('completedCount').value).toBe('12');
  });

  it('reloads the counts and the section on Refresh', async () => {
    await open();

    el<HTMLButtonElement>('.refresh').click();
    harness.detectChanges();
    expect(el<HTMLButtonElement>('.refresh').disabled).toBe(true);

    summaryRequest().flush({ ...COUNTS, currentCount: 0 });
    tasksRequest().flush(tasksResponse([]));
    harness.detectChanges();

    expect(tile('currentCount').value).toBe('0');
    expect(text('app-current-upcoming-tasks .empty-title')).toBe("You're all caught up.");
    expect(el<HTMLButtonElement>('.refresh').disabled).toBe(false);
  });

  it('links back home', async () => {
    await open();

    el<HTMLAnchorElement>('a.back').click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/home');
  });
});
