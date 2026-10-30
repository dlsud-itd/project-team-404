import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { PROJECTS_ROUTES } from '../projects/projects.routes';
import { Home } from './home';

const PROJECTS_URL = `${environment.apiBaseUrl}/api/projects`;

describe('Home tabs', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) =>
    page().querySelector(selector) as T | null;
  const tab = (id: string) => el<HTMLButtonElement>(`#tab-${id}`)!;
  const panelId = () => el('[role="tabpanel"]')?.id;

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'home', component: Home },
          { path: 'projects', children: PROJECTS_ROUTES },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  it('opens on the dashboard with its tab selected', async () => {
    await harness.navigateByUrl('/home');

    expect(panelId()).toBe('panel-dashboard');
    expect(tab('dashboard').getAttribute('aria-selected')).toBe('true');
    expect(tab('tasks').getAttribute('aria-selected')).toBe('false');
    expect(tab('dashboard').tabIndex).toBe(0);
    expect(tab('projects').tabIndex).toBe(-1);
    // Nothing slides on first load.
    expect(el('[role="tabpanel"]')?.hasAttribute('data-slide')).toBe(false);
  });

  it('swaps the content in place and keeps the tab in the URL', async () => {
    await harness.navigateByUrl('/home');
    const home = harness.routeDebugElement?.componentInstance;

    tab('tasks').click();
    await settle();

    expect(router.url).toBe('/home?tab=tasks');
    expect(panelId()).toBe('panel-tasks');
    expect(el('#panel-tasks app-all-tasks')).toBeTruthy();
    expect(el('[role="tabpanel"]')?.getAttribute('data-slide')).toBe('right');
    // Same component instance: the page was not reloaded.
    expect(harness.routeDebugElement?.componentInstance).toBe(home);
  });

  it('slides in from the left when going back to an earlier tab', async () => {
    await harness.navigateByUrl('/home?tab=tasks');

    tab('dashboard').click();
    await settle();

    expect(router.url).toBe('/home');
    expect(panelId()).toBe('panel-dashboard');
    expect(el('[role="tabpanel"]')?.getAttribute('data-slide')).toBe('left');
  });

  it('shows the projects list in the Projects tab', async () => {
    await harness.navigateByUrl('/home');

    tab('projects').click();
    await settle();

    expect(panelId()).toBe('panel-projects');
    http.expectOne(PROJECTS_URL).flush([]);
    harness.detectChanges();
    expect(el('#panel-projects h1')?.textContent).toContain('Projects');
  });

  it('moves the pill with the selected tab', async () => {
    await harness.navigateByUrl('/home?tab=projects');
    http.expectOne(PROJECTS_URL).flush([]);

    expect(el('[role="tablist"]')?.style.getPropertyValue('--tab-index')).toBe('2');
  });

  it('moves between tabs with the arrow keys', async () => {
    await harness.navigateByUrl('/home');

    el('[role="tablist"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    await settle();

    expect(router.url).toBe('/home?tab=projects');
    http.expectOne(PROJECTS_URL).flush([]);

    el('[role="tablist"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    await settle();
    expect(router.url).toBe('/home');
  });

  it('opens the Tasks tab for "+ New Task" when on Projects', async () => {
    await harness.navigateByUrl('/home?tab=projects');
    http.expectOne(PROJECTS_URL).flush([]);

    el<HTMLButtonElement>('button.new-task')!.click();
    await settle();

    expect(router.url).toBe('/home?tab=tasks');
  });

  it('sends the old /projects address to the Projects tab', async () => {
    await harness.navigateByUrl('/projects');
    http.expectOne(PROJECTS_URL).flush([]);

    expect(router.url).toBe('/home?tab=projects');
    expect(panelId()).toBe('panel-projects');
  });

  it('falls back to the dashboard for an unknown tab', async () => {
    await harness.navigateByUrl('/home?tab=nope');

    expect(panelId()).toBe('panel-dashboard');
  });
});
