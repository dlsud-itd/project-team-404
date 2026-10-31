import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { TasksStore } from '../../../features/tasks/shared/state/tasks.store';
import { AppShell } from './app-shell';

@Component({ template: '<p class="page-content">Page</p>' })
class Blank {}

describe('AppShell', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) =>
    page().querySelector(selector) as T | null;
  const tab = (id: string) => el<HTMLButtonElement>(`#tab-${id}`)!;

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: AppShell,
            children: [
              { path: 'home', component: Blank },
              { path: 'projects/:projectId/tasks', component: Blank },
              { path: 'projects/:projectId/edit', component: Blank },
              { path: 'settings/profile', component: Blank },
            ],
          },
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

  it.each(['/projects/10/tasks', '/projects/10/edit', '/settings/profile'])(
    'shows the top bar above the page at %s',
    async (url) => {
      await harness.navigateByUrl(url);

      expect(el('header.topbar')).toBeTruthy();
      expect(el('.page-content')).toBeTruthy();
    },
  );

  it.each(['/projects/10/tasks', '/projects/10/edit'])(
    'marks the Projects tab at %s',
    async (url) => {
      await harness.navigateByUrl(url);

      expect(tab('projects').getAttribute('aria-selected')).toBe('true');
      expect(el('[role="tablist"]')?.style.getPropertyValue('--tab-index')).toBe('2');
    },
  );

  it('marks no tab on a page outside them, and can still be reached by keyboard', async () => {
    await harness.navigateByUrl('/settings/profile');

    expect(el('.tab.active')).toBeNull();
    expect(el('.indicator')).toBeNull();
    expect(tab('dashboard').tabIndex).toBe(0);
  });

  it('follows the address when the page changes', async () => {
    await harness.navigateByUrl('/settings/profile');

    await harness.navigateByUrl('/projects/10/tasks');

    expect(tab('projects').classList).toContain('active');
  });

  it.each([
    ['dashboard', '/home'],
    ['tasks', '/home?tab=tasks'],
    ['projects', '/home?tab=projects'],
  ])('goes back to the %s tab from a project page', async (id, url) => {
    await harness.navigateByUrl('/projects/10/tasks');

    tab(id).click();
    await settle();

    expect(router.url).toBe(url);
  });

  it('starts a new task in the project on screen', async () => {
    await harness.navigateByUrl('/projects/10/tasks');

    el<HTMLButtonElement>('button.new-task')!.click();
    await settle();
    http.expectOne(`${environment.apiBaseUrl}/api/projects`).flush([]);
    await settle();

    expect(TestBed.inject(TasksStore).creating()).toEqual({ projectId: 10 });
    expect(el('[role="dialog"]')).toBeTruthy();
  });

  it('starts a new task in the Inbox on other pages', async () => {
    await harness.navigateByUrl('/settings/profile');

    el<HTMLButtonElement>('button.new-task')!.click();
    await settle();
    http.expectOne(`${environment.apiBaseUrl}/api/projects`).flush([]);

    expect(TestBed.inject(TasksStore).creating()).toEqual({ projectId: null });
  });
});
