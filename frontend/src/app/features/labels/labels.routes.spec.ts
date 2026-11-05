import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { authGuard } from '../auth/session/auth.guards';
import { SessionService } from '../auth/session/session.service';
import { LabelForm } from './label-form/label-form';
import { LabelList } from './label-list/label-list';
import { LABELS_ROUTES } from './labels.routes';

@Component({ template: '' })
class Blank {}

const URL = `${environment.apiBaseUrl}/api/labels`;

describe('LABELS_ROUTES', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;
  const signedIn = signal(true);

  beforeEach(async () => {
    signedIn.set(true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          // Mirrors the /labels entry in app.routes.ts.
          {
            path: 'labels',
            canActivate: [authGuard],
            loadChildren: () => import('./labels.routes').then((m) => m.LABELS_ROUTES),
          },
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

  afterEach(() => {
    // The pages load labels on open; these specs only check routing.
    http.match(() => true).forEach((req) => req.flush([]));
    http.verify();
  });

  it('defines the list, create and edit pages', () => {
    expect(LABELS_ROUTES.map((r) => r.path)).toEqual(['', 'new', ':labelId/edit']);
    expect(LABELS_ROUTES[1].data).toEqual({ mode: 'create' });
    expect(LABELS_ROUTES[2].data).toEqual({ mode: 'edit' });
  });

  it('lazy-loads the label list at /labels', async () => {
    const component = await harness.navigateByUrl('/labels');

    expect(component).toBeInstanceOf(LabelList);
    expect(document.title).toBe('Labels · HabitTracker');
    http.expectOne(URL);
  });

  it('lazy-loads the form in create mode at /labels/new', async () => {
    const component = await harness.navigateByUrl('/labels/new');

    expect(component).toBeInstanceOf(LabelForm);
    expect(document.title).toBe('New label · HabitTracker');
  });

  it('lazy-loads the form in edit mode at /labels/:labelId/edit', async () => {
    const component = await harness.navigateByUrl('/labels/3/edit');

    expect(component).toBeInstanceOf(LabelForm);
    expect(document.title).toBe('Edit label · HabitTracker');
    http.expectOne(`${URL}/3`);
  });

  it('sends signed-out users to the login page', async () => {
    signedIn.set(false);

    await harness.navigateByUrl('/labels');

    expect(router.url).toBe('/login');
    http.expectNone(URL);
  });
});
